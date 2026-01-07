import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StripeService } from '../stripe/stripe.service';
import { SmsService } from '../sms/sms.service';
import { OwnerSignupDto, OwnerLoginDto, VerifyPhoneDto } from './dto/owner-signup.dto';
import { CreateInviteDto, AcceptInviteDto, ClientSmsOptInDto } from './dto/client-invite.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthFlowService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly stripeService: StripeService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * OWNER ONBOARDING FLOW
   * Steps: email signup → verify email → add phone → create venue
   * (Stripe gating skipped for now)
   */
  async ownerSignup(dto: OwnerSignupDto) {
    const supabase = this.supabaseService.getClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: {
          first_name: dto.firstName,
          last_name: dto.lastName,
        },
      },
    });

    if (authError || !authData.user) {
      throw new BadRequestException(authError?.message || 'Failed to create user');
    }

    const userId = authData.user.id;

    // 2. Create owner_account
    const { data: ownerAccount, error: accountError } = await supabase
      .from('owner_accounts')
      .insert({
        business_name: dto.businessName,
        primary_owner_id: userId,
        subscription_status: 'active', // Skip Stripe for now
      })
      .select()
      .single();

    if (accountError) throw new BadRequestException(accountError.message);

    // 3. Create user record
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: dto.email,
        first_name: dto.firstName,
        last_name: dto.lastName,
        role: 'owner',
        phone_number: dto.phoneNumber,
        email_verified: false, // Will be verified via Supabase email
        phone_verified: false, // Skip SMS for now
        sms_opt_in: true, // Owner required
        status: 'active',
      });

    if (userError) throw new BadRequestException(userError.message);

    // 4. Create membership
    const { error: memberError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        owner_account_id: ownerAccount.id,
        role: 'owner',
        is_active: true,
      });

    if (memberError) throw new BadRequestException(memberError.message);

    // 5. Create first venue (required)
    const { error: venueError } = await supabase
      .from('venues')
      .insert({
        owner_account_id: ownerAccount.id,
        name: dto.venueName,
        address: dto.venueAddress,
        capacity: dto.venueCapacity,
      });

    if (venueError) throw new BadRequestException(venueError.message);

    // 6. Send phone verification SMS (if phone provided)
    if (dto.phoneNumber) {
      await this.smsService.sendVerificationCode(dto.phoneNumber, userId);
    }

    // Note: Stripe checkout would happen here in Phase 2
    // const checkoutUrl = await this.stripeService.createCheckoutSession(ownerAccount.id, 'price_xxx');

    return {
      userId,
      ownerAccountId: ownerAccount.id,
      message: 'Owner account created. Please verify your email and phone.',
      session: authData.session,
      // checkoutUrl, // Would redirect to Stripe in Phase 2
    };
  }

  /**
   * Verify phone with OTP
   */
  async verifyPhone(dto: VerifyPhoneDto) {
    const isValid = await this.smsService.verifyCode(dto.userId, dto.otp);
    
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('users')
      .update({ 
        phone_verified: true,
        status: 'active',
      })
      .eq('id', dto.userId);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Phone verified successfully' };
  }

  /**
   * OWNER LOGIN FLOW
   * Check email verified, subscription status (skipped for now)
   */
  async ownerLogin(dto: OwnerLoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (authError) throw new UnauthorizedException(authError.message);

    // Check user status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*, memberships!inner(owner_account_id, owner_accounts!inner(subscription_status))')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) throw new UnauthorizedException('User not found');

    if (user.role !== 'owner') {
      throw new UnauthorizedException('Not an owner account');
    }

    // Check subscription (would gate here in Phase 2)
    const subscriptionStatus = user.memberships[0]?.owner_accounts?.subscription_status;
    
    // Phase 2: Redirect to billing if not active
    // if (!['trialing', 'active'].includes(subscriptionStatus)) {
    //   const billingUrl = await this.stripeService.createBillingPortalSession(
    //     user.memberships[0].owner_accounts.stripe_customer_id
    //   );
    //   return { accessGranted: false, billingUrl };
    // }
    
    return {
      session: authData.session,
      user,
      subscriptionStatus,
      accessGranted: true,
    };
  }

  /**
   * Get billing portal URL for owner
   */
  async getBillingPortal(ownerUserId: string) {
    const supabase = this.supabaseService.getClient();
    
    const { data: membership } = await supabase
      .from('memberships')
      .select('owner_accounts(stripe_customer_id)')
      .eq('user_id', ownerUserId)
      .single();

    const ownerAccounts = membership?.owner_accounts as any;
    if (!ownerAccounts?.stripe_customer_id) {
      throw new BadRequestException('No billing account found');
    }

    const portalUrl = await this.stripeService.createBillingPortalSession(
      ownerAccounts.stripe_customer_id
    );

    return { portalUrl };
  }

  /**
   * CLIENT INVITE FLOW
   * Owner creates invite → client accepts → client completes SMS opt-in
   */
  async createClientInvite(dto: CreateInviteDto, ownerUserId: string) {
    const supabase = this.supabaseService.getClient();

    // Get owner's account
    const { data: membership } = await supabase
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', ownerUserId)
      .eq('role', 'owner')
      .single();

    if (!membership) throw new UnauthorizedException('Not an owner');

    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        owner_account_id: membership.owner_account_id,
        email: dto.email,
        phone: dto.phoneNumber,
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // TODO: Send email with invite link containing token
    
    return {
      inviteId: invite.id,
      inviteToken,
      inviteLink: `${process.env.FRONTEND_URL}/invite/${inviteToken}`,
      expiresAt: invite.expires_at,
    };
  }

  async acceptClientInvite(dto: AcceptInviteDto, ipAddress?: string, userAgent?: string) {
    const supabase = this.supabaseService.getClient();

    // 1. Validate invite token
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*, owner_accounts(*)')
      .eq('invite_token', dto.inviteToken)
      .is('accepted_at', null)
      .single();

    if (inviteError || !invite) {
      throw new BadRequestException('Invalid or expired invite');
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    if (!dto.smsOptIn) {
      throw new BadRequestException('SMS opt-in is required for client accounts');
    }

    let userId: string;

    // 2. Check if user exists or create new
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', invite.email)
      .single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password: dto.password,
      });

      if (authError || !authData.user) {
        throw new BadRequestException(authError?.message || 'Failed to create user');
      }
      userId = authData.user.id;

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: invite.email,
          role: 'client',
          phone_number: invite.phone,
          email_verified: false,
          phone_verified: false,
          sms_opt_in: dto.smsOptIn,
          sms_opt_in_date: new Date().toISOString(),
          sms_opt_in_ip: ipAddress,
          sms_opt_in_user_agent: userAgent,
          status: 'active',
        });

      if (userError) throw new BadRequestException(userError.message);
    }

    // 3. Create client profile
    const { error: profileError } = await supabase
      .from('client_profiles')
      .insert({
        user_id: userId,
        owner_account_id: invite.owner_account_id,
      });

    if (profileError) throw new BadRequestException(profileError.message);

    // 4. Mark invite as accepted
    await supabase
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    // 5. Send SMS verification if phone provided
    if (invite.phone && dto.smsOptIn) {
      await this.smsService.sendVerificationCode(invite.phone, userId);
    }

    return {
      userId,
      message: 'Invite accepted. Please verify your email and phone.',
      ownerBrand: invite.owner_accounts.business_name,
      needsPhoneVerification: !!invite.phone,
    };
  }

  /**
   * Record SMS consent for client
   */
  async recordSmsConsent(dto: ClientSmsOptInDto) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('users')
      .update({
        sms_opt_in: dto.consentGiven,
        sms_opt_in_date: new Date().toISOString(),
        sms_opt_in_ip: dto.ipAddress,
        sms_opt_in_user_agent: dto.userAgent,
        phone_number: dto.phoneNumber,
      })
      .eq('id', dto.userId);

    if (error) throw new BadRequestException(error.message);

    // Send verification SMS
    if (dto.consentGiven) {
      await this.smsService.sendVerificationCode(dto.phoneNumber, dto.userId);
    }

    return { message: 'SMS consent recorded. Verification code sent.' };
  }

  /**
   * ADMIN LOGIN (Email-only, no MFA)
   */
  async adminLogin(email: string, password: string) {
    const supabase = this.supabaseService.getClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new UnauthorizedException(authError.message);

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (user?.role !== 'admin') {
      throw new UnauthorizedException('Not an admin account');
    }

    return {
      session: authData.session,
      user,
    };
  }
}
