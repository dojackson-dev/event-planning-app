import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StripeService } from '../stripe/stripe.service';
import { SmsService } from '../sms/sms.service';
import { TrialService } from '../trial/trial.service';
import { TwilioService } from '../messaging/twilio.service.js';
import { OwnerSignupDto, OwnerLoginDto, VerifyPhoneDto } from './dto/owner-signup.dto';
import { CreateInviteDto, AcceptInviteDto, ClientSmsOptInDto } from './dto/client-invite.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthFlowService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly stripeService: StripeService,
    private readonly smsService: SmsService,
    private readonly trialService: TrialService,
    private readonly twilioService: TwilioService,
  ) {}

  /**
   * OWNER ONBOARDING FLOW
   * Steps: email signup → verify email → add phone → create venue
   * (Stripe gating skipped for now)
   */
  async ownerSignup(dto: OwnerSignupDto) {
    const supabase = this.supabaseService.getClient();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', dto.email.toLowerCase())
      .single();

    if (existingUser) {
      throw new BadRequestException('An account with this email already exists');
    }

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

    // Check for Supabase's "fake success" response when email already exists
    if (!authData.user.identities || authData.user.identities.length === 0) {
      throw new BadRequestException('An account with this email already exists');
    }

    const userId = authData.user.id;

    // 2. Create user record first (owner_accounts FK references users.id)
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: dto.email,
        first_name: dto.firstName,
        last_name: dto.lastName,
        role: 'owner',
        roles: ['owner'],
        phone_number: dto.phoneNumber,
        email_verified: false, // Will be verified via Supabase email
        phone_verified: false, // Skip SMS for now
        sms_opt_in: dto.smsOptIn === true,
        sms_opt_in_at: dto.smsOptIn === true ? new Date().toISOString() : null,
        status: 'active',
      });

    if (userError) throw new BadRequestException(userError.message);

    // 3. Create owner_account with trial (FK primary_owner_id → users.id)
    const { data: ownerAccount, error: accountError } = await supabase
      .from('owner_accounts')
      .insert({
        business_name: dto.businessName,
        primary_owner_id: userId,
        subscription_status: 'trial', // Start with free trial
        intake_slug: await this.generateUniqueSlug(dto.businessName, supabase),
      })
      .select()
      .single();

    if (accountError) throw new BadRequestException(accountError.message);

    // Create trial period (30 days default, or configurable)
    await this.trialService.createTrial(ownerAccount.id);

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
        city: dto.venueCity,
        state: dto.venueState,
        zip_code: dto.venueZipCode,
        phone: dto.venuePhone,
        email: dto.venueEmail,
        capacity: dto.venueCapacity,
        description: dto.venueDescription,
      });

    if (venueError) throw new BadRequestException(venueError.message);

    // 6. Send welcome SMS if they opted in
    if (dto.phoneNumber && dto.smsOptIn) {
      try {
        await this.twilioService.sendSMS(
          dto.phoneNumber,
          'Welcome to DoVenue Suite! You are now subscribed to SMS notifications for account updates, event confirmations, reminders, and more. To unsubscribe at any time, reply STOP. You\'ll receive a confirmation: "You have successfully been unsubscribed. You will not receive any more messages from this number. Reply START to resubscribe." Msg & data rates may apply.',
        );
      } catch {
        // Non-fatal — don't block account creation if SMS fails
      }
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

  /** Converts a business name to a URL-safe slug and ensures it's unique in owner_accounts. */
  private async generateUniqueSlug(businessName: string, supabase: any): Promise<string> {
    const base = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = base;
    let attempt = 2;
    while (true) {
      const { data } = await supabase
        .from('owner_accounts')
        .select('id')
        .eq('intake_slug', slug)
        .maybeSingle();
      if (!data) return slug; // slug is free
      slug = `${base}-${attempt++}`;
    }
  }

  /**
   * Helper: check whether a user record includes a given role
   * Checks both the legacy single `role` column and the new `roles[]` array.
   */
  private userHasRole(user: any, role: string): boolean {
    if (user.role === role) return true;
    if (Array.isArray(user.roles) && user.roles.includes(role)) return true;
    return false;
  }

  /**
   * Helper: get all roles for a user as a clean string array
   */
  private getUserRoles(user: any): string[] {
    const rolesArray: string[] = Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : user.role ? [user.role] : [];
    // Deduplicate
    return [...new Set(rolesArray)];
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

    // Check user status — use left joins to avoid false-negative "User not found"
    // when a user exists in auth but their membership record is incomplete
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*, memberships(owner_account_id, owner_accounts(subscription_status))')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) throw new UnauthorizedException('User not found');

    if (!this.userHasRole(user, 'owner')) {
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
      roles: this.getUserRoles(user),
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
      inviteLink: `${process.env.FRONTEND_URL || 'https://dovenuesuite.com'}/invite/${inviteToken}`,
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
      if (!dto.password) {
        throw new BadRequestException('Password is required for new accounts');
      }

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
   * VENDOR SIGNUP
   * Creates a Supabase auth user + user record with role = 'vendor'
   * The vendor_account is then created separately via POST /vendors/account
   */
  async vendorSignup(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    smsOptIn?: boolean;
  }) {
    const adminClient = this.supabaseService.getAdminClient();

    // Check existing
    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .eq('email', dto.email.toLowerCase())
      .single();

    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    const { data: authData, error: authError } = await adminClient.auth.signUp({
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

    if (!authData.user.identities || authData.user.identities.length === 0) {
      throw new BadRequestException('An account with this email already exists');
    }

    const userId = authData.user.id;

    const { error: userError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        email: dto.email,
        first_name: dto.firstName,
        last_name: dto.lastName,
        role: 'vendor',
        roles: ['vendor'],
        phone_number: dto.phoneNumber,
        email_verified: false,
        phone_verified: false,
        sms_opt_in: dto.smsOptIn === true,
        sms_opt_in_at: dto.smsOptIn === true ? new Date().toISOString() : null,
        status: 'active',
      });

    if (userError) throw new BadRequestException(userError.message);

    // Send welcome SMS if opted in
    if (dto.phoneNumber && dto.smsOptIn) {
      try {
        await this.twilioService.sendSMS(
          dto.phoneNumber,
          'Welcome to DoVenue Suite! You are now subscribed to SMS notifications for account updates, event confirmations, reminders, and more. To unsubscribe at any time, reply STOP. Msg & data rates may apply.',
        );
      } catch {
        // Non-fatal — don\'t block account creation if SMS fails
      }
    }

    return {
      userId,
      message: 'Vendor account created. Please verify your email and complete your profile.',
      session: authData.session,
    };
  }

  /**
   * VENDOR LOGIN
   */
  async vendorLogin(email: string, password: string) {
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

    if (!user || !this.userHasRole(user, 'vendor')) {
      throw new UnauthorizedException('Not a vendor account');
    }

    // Check for vendor account (profile)
    const adminClient = this.supabaseService.getAdminClient();
    const { data: vendorAccount } = await adminClient
      .from('vendor_accounts')
      .select('id, business_name, category, is_active')
      .eq('user_id', authData.user.id)
      .single();

    return {
      session: authData.session,
      user,
      roles: this.getUserRoles(user),
      vendorAccount,
      hasProfile: !!vendorAccount,
    };
  }

  /**
   * UNIFIED LOGIN
   * Single endpoint for all roles. Returns all roles the user has.
   * Frontend uses the roles array to decide where to navigate.
   */
  async unifiedLogin(email: string, password: string) {
    const supabase = this.supabaseService.getClient();
    const adminClient = this.supabaseService.getAdminClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new UnauthorizedException(authError.message);

    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Fall back to Supabase auth metadata if no users-table row exists yet
    const user = dbUser ?? {
      id:            authData.user.id,
      email:         authData.user.email,
      first_name:    authData.user.user_metadata?.first_name ?? '',
      last_name:     authData.user.user_metadata?.last_name ?? '',
      role:          authData.user.user_metadata?.role ?? 'owner',
      roles:         authData.user.user_metadata?.roles ?? null,
      created_at:    authData.user.created_at,
      updated_at:    authData.user.updated_at,
    };

    const roles = this.getUserRoles(user);

    // Fetch owner subscription status if user is an owner
    let subscriptionStatus: string | null = null;
    let ownerAccountId: string | null = null;
    if (this.userHasRole(user, 'owner')) {
      const { data: membership } = await supabase
        .from('memberships')
        .select('owner_account_id, owner_accounts(subscription_status)')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      subscriptionStatus = (membership?.owner_accounts as any)?.subscription_status ?? null;
      ownerAccountId = membership?.owner_account_id ?? null;
    }

    // Fetch vendor account if user is a vendor
    let vendorAccount: any = null;
    if (this.userHasRole(user, 'vendor')) {
      const { data: va } = await adminClient
        .from('vendor_accounts')
        .select('id, business_name, category, is_active')
        .eq('user_id', user.id)
        .single();
      vendorAccount = va;
    }

    return {
      session: authData.session,
      user,
      roles,
      subscriptionStatus,
      ownerAccountId,
      vendorAccount,
      hasVendorProfile: !!vendorAccount,
      accessGranted: true,
    };
  }

  /**
   * ADD ROLE TO EXISTING USER
   * Call this when an owner wants to also become a vendor, or vice versa.
   * The caller must pass a valid access_token so we can identify them.
   */
  async addRoleToUser(accessToken: string, newRole: 'owner' | 'vendor') {
    const supabase = this.supabaseService.getClient();
    const adminClient = this.supabaseService.getAdminClient();

    // Verify token and get user id
    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !authUser) throw new UnauthorizedException('Invalid or expired token');

    const { data: user, error: userErr } = await adminClient
      .from('users')
      .select('id, role, roles')
      .eq('id', authUser.id)
      .single();

    if (userErr || !user) throw new UnauthorizedException('User not found');

    const currentRoles = this.getUserRoles(user);
    if (currentRoles.includes(newRole)) {
      return { message: 'Role already assigned', roles: currentRoles };
    }

    const updatedRoles = [...currentRoles, newRole];

    const { error: updateErr } = await adminClient
      .from('users')
      .update({ roles: updatedRoles })
      .eq('id', user.id);

    if (updateErr) throw new BadRequestException(updateErr.message);

    return {
      message: `Role '${newRole}' added successfully`,
      roles: updatedRoles,
    };
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
