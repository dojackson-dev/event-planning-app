import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import {
  PromoterAccessService,
  PromoterTeamRole,
} from './promoter-access.service';

export const MAX_PROMOTER_TEAM_SIZE = 3;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ROLES: PromoterTeamRole[] = ['admin', 'staff'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OwnedAccount {
  id: string;
  user_id: string;
  email: string | null;
  company_name: string | null;
  contact_name: string | null;
}

@Injectable()
export class PromoterTeamService {
  private readonly logger = new Logger(PromoterTeamService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
    private readonly access: PromoterAccessService,
  ) {}

  /** The promoter account created by this user; only the creator may manage the team. */
  private async getOwnedAccount(userId: string): Promise<OwnedAccount> {
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('promoter_accounts')
      .select('id, user_id, email, company_name, contact_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      throw new ForbiddenException(
        'Only the promoter account owner can manage the team',
      );
    }
    return data as OwnedAccount;
  }

  private accountLabel(account: {
    company_name: string | null;
    contact_name: string | null;
  }): string {
    return account.company_name || account.contact_name || 'EventEcos';
  }

  /** GET /promoter-team/me — the caller's role on a promoter account. */
  async getMe(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: owned } = await admin
      .from('promoter_accounts')
      .select('id, company_name, contact_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (owned) {
      return {
        role: 'owner' as const,
        accountId: owned.id as string,
        accountName: this.accountLabel(owned),
        maxTeamSize: MAX_PROMOTER_TEAM_SIZE,
      };
    }

    const membership = await this.access.getMembership(userId);
    if (!membership) return { role: null, accountId: null, accountName: null };

    const { data: account } = await admin
      .from('promoter_accounts')
      .select('company_name, contact_name')
      .eq('id', membership.promoterAccountId)
      .maybeSingle();
    return {
      role: membership.role,
      accountId: membership.promoterAccountId,
      accountName: account ? this.accountLabel(account) : null,
    };
  }

  async listMembers(userId: string) {
    const account = await this.getOwnedAccount(userId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_team_members')
      .select(
        'id, role, created_at, user:users(id, email, first_name, last_name)',
      )
      .eq('promoter_account_id', account.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async listInvitations(userId: string) {
    const account = await this.getOwnedAccount(userId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_team_invitations')
      .select('id, email, role, status, created_at, expires_at')
      .eq('promoter_account_id', account.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async invite(userId: string, rawEmail: string, rawRole: string) {
    const account = await this.getOwnedAccount(userId);
    const admin = this.supabaseService.getAdminClient();

    const email = (rawEmail ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException('A valid email is required');
    }
    if (!ROLES.includes(rawRole as PromoterTeamRole)) {
      throw new BadRequestException('Role must be admin or staff');
    }
    const role = rawRole as PromoterTeamRole;

    if (account.email && account.email.toLowerCase() === email) {
      throw new BadRequestException('You already own this account');
    }

    // Lapsed pending invites would otherwise block re-inviting the same email
    await admin
      .from('promoter_team_invitations')
      .update({ status: 'expired' })
      .eq('promoter_account_id', account.id)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    const [{ count: memberCount }, { count: pendingCount }] = await Promise.all(
      [
        admin
          .from('promoter_team_members')
          .select('id', { count: 'exact', head: true })
          .eq('promoter_account_id', account.id)
          .eq('is_active', true),
        admin
          .from('promoter_team_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('promoter_account_id', account.id)
          .eq('status', 'pending'),
      ],
    );
    if ((memberCount ?? 0) + (pendingCount ?? 0) >= MAX_PROMOTER_TEAM_SIZE) {
      throw new BadRequestException(
        `Your team is limited to ${MAX_PROMOTER_TEAM_SIZE} members (including pending invitations). Remove someone to invite another person.`,
      );
    }

    await this.assertInvitable(email);

    const { data: existingInvite } = await admin
      .from('promoter_team_invitations')
      .select('id')
      .eq('promoter_account_id', account.id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();
    if (existingInvite) {
      throw new BadRequestException(
        'An invitation has already been sent to this email',
      );
    }

    const token = randomBytes(32).toString('hex');
    const { error: insertError } = await admin
      .from('promoter_team_invitations')
      .insert({
        promoter_account_id: account.id,
        invited_by_user_id: userId,
        email,
        role,
        token,
        status: 'pending',
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      });
    if (insertError) throw new BadRequestException(insertError.message);

    const emailError = await this.sendInviteEmail(account, userId, {
      email,
      role,
      token,
    });
    return {
      success: true,
      emailDelivered: !emailError,
      message: emailError
        ? `Invitation created for ${email} but email delivery failed: ${emailError}`
        : `Invitation sent to ${email}`,
    };
  }

  /** Rejects emails that cannot join a promoter team without breaking account resolution. */
  private async assertInvitable(email: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: user } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (!user) return;

    const { data: ownsAccount } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (ownsAccount) {
      throw new BadRequestException(
        'This person already has their own promoter account',
      );
    }
    const { data: member } = await admin
      .from('promoter_team_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (member) {
      throw new BadRequestException(
        'This person is already on a promoter team',
      );
    }
  }

  private async sendInviteEmail(
    account: OwnedAccount,
    inviterUserId: string,
    invite: { email: string; role: PromoterTeamRole; token: string },
  ): Promise<string | null> {
    const admin = this.supabaseService.getAdminClient();
    const { data: inviter } = await admin
      .from('users')
      .select('first_name, last_name')
      .eq('id', inviterUserId)
      .maybeSingle();
    const ownerName =
      [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ') ||
      'Your promoter';
    const frontendUrl = process.env.FRONTEND_URL || 'https://eventecos.com';

    try {
      await this.mailService.sendTeamInvitation({
        toEmail: invite.email,
        inviteUrl: `${frontendUrl}/team/accept?token=${invite.token}`,
        ownerName,
        businessName: this.accountLabel(account),
        roleLabel: invite.role === 'admin' ? 'an admin' : 'a staff member',
        roleDescription:
          invite.role === 'admin'
            ? "As an admin, you'll be able to manage events, tickets, bookings, and invoices — without access to team, payout, or account settings."
            : "As a staff member, you'll be able to view events and attendees and scan tickets at the door.",
      });
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email failed';
      this.logger.error(`Team invite email failed: ${message}`);
      return message;
    }
  }

  async resendInvitation(userId: string, invitationId: string) {
    const account = await this.getOwnedAccount(userId);
    const admin = this.supabaseService.getAdminClient();
    const { data: invite } = await admin
      .from('promoter_team_invitations')
      .select('id, email, role, token, status')
      .eq('id', invitationId)
      .eq('promoter_account_id', account.id)
      .maybeSingle();
    if (!invite) throw new NotFoundException('Invitation not found');
    if (invite.status !== 'pending') {
      throw new BadRequestException('Invitation is no longer pending');
    }

    await admin
      .from('promoter_team_invitations')
      .update({
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      })
      .eq('id', invite.id);

    const emailError = await this.sendInviteEmail(account, userId, {
      email: invite.email as string,
      role: invite.role as PromoterTeamRole,
      token: invite.token as string,
    });
    if (emailError) {
      throw new BadRequestException(`Email delivery failed: ${emailError}`);
    }
    return { success: true, message: `Invitation resent to ${invite.email}` };
  }

  async cancelInvitation(userId: string, invitationId: string) {
    const account = await this.getOwnedAccount(userId);
    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin
      .from('promoter_team_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)
      .eq('promoter_account_id', account.id)
      .eq('status', 'pending');
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  /** DELETE /promoter-team/members/:memberId — creator removes a teammate. */
  async removeMember(userId: string, memberId: string) {
    const account = await this.getOwnedAccount(userId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_team_members')
      .delete()
      .eq('id', memberId)
      .eq('promoter_account_id', account.id)
      .select('id, user_id');
    if (error) throw new BadRequestException(error.message);
    if (!data || data.length === 0) {
      throw new NotFoundException('Team member not found');
    }
    await this.dropPromoterRoleIfUnused(data[0].user_id as string);
    return { success: true };
  }

  /** Removed teammates who also hold other roles should no longer be routed to the promoter dashboard. */
  private async dropPromoterRoleIfUnused(removedUserId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: ownAccount } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', removedUserId)
      .maybeSingle();
    if (ownAccount) return;

    const { data: user } = await admin
      .from('users')
      .select('roles')
      .eq('id', removedUserId)
      .maybeSingle();
    const roles = Array.isArray(user?.roles) ? (user.roles as string[]) : [];
    if (roles.length > 1 && roles.includes('promoter')) {
      await admin
        .from('users')
        .update({ roles: roles.filter((r) => r !== 'promoter') })
        .eq('id', removedUserId);
    }
  }

  // ── Invitation acceptance (public, token-based) ─────────────────

  /** True when the token belongs to a promoter invite (used by TeamController to route). */
  async hasInvite(token: string): Promise<boolean> {
    if (!token) return false;
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('promoter_team_invitations')
      .select('id')
      .eq('token', token)
      .maybeSingle();
    return !!data;
  }

  private async getPendingInvite(token: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: invite } = await admin
      .from('promoter_team_invitations')
      .select(
        'id, email, role, status, expires_at, invited_by_user_id, promoter_account_id, account:promoter_accounts(company_name, contact_name)',
      )
      .eq('token', token)
      .maybeSingle();

    if (!invite) throw new NotFoundException('Invitation not found');
    if (invite.status !== 'pending') {
      throw new BadRequestException(
        'This invitation has already been used or expired',
      );
    }
    if (new Date(invite.expires_at as string) < new Date()) {
      await admin
        .from('promoter_team_invitations')
        .update({ status: 'expired' })
        .eq('id', invite.id);
      throw new BadRequestException(
        'This invitation has expired. Please ask the account owner to resend it.',
      );
    }
    return invite;
  }

  async getInviteInfo(token: string) {
    const admin = this.supabaseService.getAdminClient();
    const invite = await this.getPendingInvite(token);
    const account = invite.account as unknown as {
      company_name: string | null;
      contact_name: string | null;
    } | null;

    const { data: inviter } = invite.invited_by_user_id
      ? await admin
          .from('users')
          .select('first_name, last_name')
          .eq('id', invite.invited_by_user_id)
          .maybeSingle()
      : { data: null };
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', invite.email)
      .maybeSingle();

    return {
      email: invite.email as string,
      businessName: account ? this.accountLabel(account) : 'EventEcos',
      ownerName:
        [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ') ||
        'The account owner',
      role: invite.role === 'admin' ? 'admin' : 'staff member',
      portal: 'promoter' as const,
      existingUser: !!existingUser,
    };
  }

  async acceptInvite(
    token: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const supabase = this.supabaseService.getClient();
    const invite = await this.getPendingInvite(token);
    const email = invite.email as string;

    const { data: existingUser } = await admin
      .from('users')
      .select('id, role, roles')
      .eq('email', email)
      .maybeSingle();

    let userId: string;
    if (existingUser) {
      userId = existingUser.id as string;
      await this.assertInvitable(email);
    } else {
      if (!firstName?.trim() || !lastName?.trim()) {
        throw new BadRequestException('First and last name are required');
      }
      if (!password || password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters');
      }
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName.trim(), last_name: lastName.trim() },
        },
      });
      if (authErr || !authData.user) {
        throw new BadRequestException(
          authErr?.message || 'Failed to create account',
        );
      }
      userId = authData.user.id;

      const { error: userInsertErr } = await admin.from('users').insert({
        id: userId,
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'promoter',
        roles: ['promoter'],
        email_verified: true,
        phone_verified: false,
        sms_opt_in: false,
      });
      if (userInsertErr) {
        throw new BadRequestException(
          `Failed to create team member profile: ${userInsertErr.message}`,
        );
      }
    }

    const { error: memberErr } = await admin
      .from('promoter_team_members')
      .insert({
        promoter_account_id: invite.promoter_account_id,
        user_id: userId,
        role: invite.role,
        is_active: true,
        invited_by_user_id: invite.invited_by_user_id,
      });
    if (memberErr) {
      throw new BadRequestException(
        `Failed to join the team: ${memberErr.message}`,
      );
    }

    await admin
      .from('promoter_team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // Existing users keep their other roles; add promoter so login routes them in
    if (existingUser) {
      const current: string[] =
        Array.isArray(existingUser.roles) && existingUser.roles.length > 0
          ? (existingUser.roles as string[])
          : existingUser.role
            ? [existingUser.role as string]
            : [];
      if (!current.includes('promoter')) {
        await admin
          .from('users')
          .update({ roles: [...current, 'promoter'] })
          .eq('id', userId);
      }
    }

    let session: unknown = null;
    if (!existingUser) {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      session = signInData?.session ?? null;
    }

    const { data: userRow } = await admin
      .from('users')
      .select('id, email, first_name, last_name, role, roles')
      .eq('id', userId)
      .single();

    return {
      success: true,
      message: 'You have joined the team!',
      session,
      user: userRow,
      roles: (userRow?.roles as string[] | undefined) ?? ['promoter'],
      portal: 'promoter' as const,
      existingUser: !!existingUser,
    };
  }
}
