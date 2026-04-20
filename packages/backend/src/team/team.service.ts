import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TeamService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  /** Resolve owner_account_id for the given auth user */
  private async getOwnerAccountId(userId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .eq('is_active', true)
      .single();
    if (error || !data) throw new ForbiddenException('Owner account not found');
    return data.owner_account_id;
  }

  /** GET /team/members — list all associates for this owner */
  async getMembers(userId: string) {
    const ownerAccountId = await this.getOwnerAccountId(userId);
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('memberships')
      .select('id, role, is_active, created_at, user:users(id, email, first_name, last_name)')
      .eq('owner_account_id', ownerAccountId)
      .eq('role', 'associate')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /** GET /team/invitations — list pending invitations */
  async getInvitations(userId: string) {
    const ownerAccountId = await this.getOwnerAccountId(userId);
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('team_invitations')
      .select('id, email, role, status, created_at, expires_at')
      .eq('owner_account_id', ownerAccountId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /** POST /team/invite — owner invites an associate by email */
  async inviteAssociate(userId: string, email: string) {
    const admin = this.supabaseService.getAdminClient();
    const ownerAccountId = await this.getOwnerAccountId(userId);

    // Check email isn't already a member
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      const { data: existingMember } = await admin
        .from('memberships')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('owner_account_id', ownerAccountId)
        .maybeSingle();
      if (existingMember) {
        throw new BadRequestException('This person is already a member of your team');
      }
    }

    // Check for existing pending invite
    const { data: existingInvite } = await admin
      .from('team_invitations')
      .select('id')
      .eq('owner_account_id', ownerAccountId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      throw new BadRequestException('An invitation has already been sent to this email');
    }

    // Get owner info for the email
    const { data: owner } = await admin
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    const { data: ownerAccount } = await admin
      .from('owner_accounts')
      .select('business_name')
      .eq('id', ownerAccountId)
      .single();

    // Create invitation
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: inviteError } = await admin
      .from('team_invitations')
      .insert({
        owner_account_id: ownerAccountId,
        invited_by_user_id: userId,
        email: email.toLowerCase(),
        role: 'associate',
        token,
        status: 'pending',
        expires_at: expiresAt,
      });

    if (inviteError) throw new BadRequestException(inviteError.message);

    // Send invite email
    const frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
    const inviteUrl = `${frontendUrl}/team/accept?token=${token}`;
    const ownerName = [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || 'Your venue owner';
    const businessName = ownerAccount?.business_name || 'DoVenueSuite';

    await this.mailService.sendTeamInvitation({
      toEmail: email,
      inviteUrl,
      ownerName,
      businessName,
    });

    return { success: true, message: `Invitation sent to ${email}` };
  }

  /** POST /team/accept — accept invite and create/link account */
  async acceptInvite(token: string, password: string, firstName: string, lastName: string) {
    const admin = this.supabaseService.getAdminClient();

    // Look up and validate token
    const { data: invite, error: invErr } = await admin
      .from('team_invitations')
      .select('*, owner_account:owner_accounts(id, business_name)')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (invErr || !invite) throw new BadRequestException('Invalid or expired invitation link');
    if (new Date(invite.expires_at) < new Date()) {
      await admin.from('team_invitations').update({ status: 'expired' }).eq('id', invite.id);
      throw new BadRequestException('This invitation has expired. Please ask the owner to resend it.');
    }

    const supabase = this.supabaseService.getClient();

    // Check if user already exists
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', invite.email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // User exists — just add the membership
      userId = existingUser.id;
    } else {
      // Create new auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });

      if (authErr || !authData.user) {
        throw new BadRequestException(authErr?.message || 'Failed to create account');
      }
      userId = authData.user.id;

      // Create users row
      await admin.from('users').insert({
        id: userId,
        email: invite.email,
        first_name: firstName,
        last_name: lastName,
        role: 'associate',
        roles: ['associate'],
        email_verified: true,
        phone_verified: false,
        sms_opt_in: false,
      });
    }

    // Create membership
    await admin.from('memberships').insert({
      user_id: userId,
      owner_account_id: invite.owner_account_id,
      role: 'associate',
      is_active: true,
    });

    // Mark invite accepted
    await admin
      .from('team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // Sign them in to return a session
    let session: any = null;
    if (!existingUser) {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      session = signInData?.session ?? null;
    }

    // Fetch the user row to return in response
    const { data: userRow } = await admin
      .from('users')
      .select('id, email, first_name, last_name, role, roles')
      .eq('id', userId)
      .single();

    return {
      success: true,
      message: `You have joined ${(invite.owner_account as any)?.business_name || 'the team'}!`,
      session,
      user: userRow,
      roles: ['associate'],
      ownerAccountId: invite.owner_account_id,
    };
  }

  /** GET /team/invite-info/:token — preview invite without accepting */
  async getInviteInfo(token: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: invite, error } = await admin
      .from('team_invitations')
      .select('email, status, expires_at, invited_by_user_id, owner_account:owner_accounts(business_name)')
      .eq('token', token)
      .maybeSingle();

    if (error || !invite) throw new NotFoundException('Invitation not found');
    if (invite.status !== 'pending') throw new BadRequestException('This invitation has already been used or expired');
    if (new Date(invite.expires_at) < new Date()) throw new BadRequestException('This invitation has expired');

    const { data: inviter } = await admin
      .from('users')
      .select('first_name, last_name')
      .eq('id', invite.invited_by_user_id)
      .single();

    return {
      email: invite.email,
      businessName: (invite.owner_account as any)?.business_name,
      ownerName: [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ') || 'Your venue owner',
      role: 'associate',
    };
  }

  /** DELETE /team/members/:memberUserId — owner removes an associate */
  async removeMember(ownerUserId: string, memberUserId: string) {
    const admin = this.supabaseService.getAdminClient();
    const ownerAccountId = await this.getOwnerAccountId(ownerUserId);

    const { error } = await admin
      .from('memberships')
      .update({ is_active: false })
      .eq('user_id', memberUserId)
      .eq('owner_account_id', ownerAccountId)
      .eq('role', 'associate');

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  /** DELETE /team/invitations/:id — cancel a pending invite */
  async cancelInvitation(ownerUserId: string, invitationId: string) {
    const admin = this.supabaseService.getAdminClient();
    const ownerAccountId = await this.getOwnerAccountId(ownerUserId);

    const { error } = await admin
      .from('team_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId)
      .eq('owner_account_id', ownerAccountId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
