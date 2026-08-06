import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterAffiliateDto, UpdateAffiliateDto } from './dto/affiliate.dto';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';

/** Commission rates */
const CONVERSION_RATE = 0.5; // 50% of first subscription payment
const RECURRING_RATE = 0.03; // 3% of each subsequent payment
const MAX_COMMISSION_YEARS = 3;

@Injectable()
export class AffiliatesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  // ─── Invite Flow ─────────────────────────────────────────────────────────

  async inviteAffiliate(email: string, managerEmail: string) {
    const admin = this.supabaseService.getAdminClient();

    // Only the sales manager can send invites
    if (managerEmail !== 'sales@eventecos.com') {
      throw new ForbiddenException('Only the sales manager can send invites');
    }

    const normalizedEmail = email.toLowerCase();

    // Check if already an affiliate
    const { data: existing } = await admin
      .from('affiliates')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(
        'This email is already registered as an affiliate',
      );
    }

    // Revoke any previous unused invite for this email
    await admin
      .from('affiliate_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
      .is('used_at', null);

    // Generate a secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: insertErr } = await admin.from('affiliate_invites').insert({
      email: normalizedEmail,
      token,
      invited_by: managerEmail,
      expires_at: expiresAt.toISOString(),
    });

    if (insertErr) {
      throw new BadRequestException(insertErr.message);
    }

    // Send the invite email
    await this.mailService.sendAffiliateInvite({
      toEmail: normalizedEmail,
      inviteToken: token,
    });

    return { message: `Invite sent to ${normalizedEmail}` };
  }

  async validateInviteToken(token: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data: invite } = await admin
      .from('affiliate_invites')
      .select('email, used_at, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (!invite) return { valid: false, reason: 'Invalid invite link' };
    if (invite.used_at)
      return { valid: false, reason: 'This invite link has already been used' };
    if (new Date(invite.expires_at) < new Date())
      return { valid: false, reason: 'This invite link has expired' };

    return { valid: true, email: invite.email };
  }

  // ─── Registration ────────────────────────────────────────────────────────

  async register(dto: RegisterAffiliateDto) {
    const admin = this.supabaseService.getAdminClient();

    // Validate invite token
    const { data: invite, error: inviteErr } = await admin
      .from('affiliate_invites')
      .select('id, email, used_at, expires_at')
      .eq('token', dto.inviteToken)
      .maybeSingle();

    if (inviteErr || !invite) {
      throw new BadRequestException('Invalid or expired invite link');
    }
    if (invite.used_at) {
      throw new BadRequestException('This invite link has already been used');
    }
    if (new Date(invite.expires_at) < new Date()) {
      throw new BadRequestException('This invite link has expired');
    }
    if (invite.email.toLowerCase() !== dto.email.toLowerCase()) {
      throw new BadRequestException(
        'This invite was sent to a different email address',
      );
    }

    // Check email uniqueness in users table
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('email', dto.email.toLowerCase())
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists',
      );
    }

    // Create Supabase auth user — auto-confirm email so affiliates can login immediately
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          first_name: dto.firstName,
          last_name: dto.lastName,
          role: 'affiliate',
        },
      });

    if (authError || !authData.user) {
      throw new BadRequestException(
        authError?.message || 'Failed to create user',
      );
    }

    const userId = authData.user.id;

    // Insert into users table with role = 'affiliate'
    const { error: userError } = await admin.from('users').insert({
      id: userId,
      email: dto.email.toLowerCase(),
      first_name: dto.firstName,
      last_name: dto.lastName,
      role: 'affiliate',
      roles: ['affiliate'],
      phone_number: dto.phone ?? null,
      status: 'active',
    });

    if (userError) {
      await admin.auth.admin.deleteUser(userId);
      throw new BadRequestException(userError.message);
    }

    // Generate unique referral code
    const referralCode = await this.generateReferralCode(dto.firstName, admin);

    // Insert into affiliates table
    const { data: affiliate, error: affError } = await admin
      .from('affiliates')
      .insert({
        user_id: userId,
        first_name: dto.firstName,
        last_name: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone ?? null,
        referral_code: referralCode,
        status: 'active',
      })
      .select()
      .single();

    if (affError) {
      await admin.auth.admin.deleteUser(userId);
      throw new BadRequestException(affError.message);
    }

    // Mark invite as used
    await admin
      .from('affiliate_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('token', dto.inviteToken);

    // Sign in to get a session for the new affiliate
    const anonClient = this.supabaseService.getClient();
    const { data: sessionData, error: sessionError } =
      await anonClient.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (sessionError) {
      // Registration succeeded but auto-login failed — not critical
      return { affiliate, session: null };
    }

    return {
      affiliate,
      session: sessionData.session,
    };
  }

  async login(email: string, password: string) {
    const anonClient = this.supabaseService.getClient();
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify this is an affiliate user
    const admin = this.supabaseService.getAdminClient();
    const { data: userData } = await admin
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (!userData || userData.role !== 'affiliate') {
      throw new UnauthorizedException('This account is not a sales affiliate');
    }

    const { data: affiliate } = await admin
      .from('affiliates')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      affiliate,
    };
  }

  // ─── Profile ─────────────────────────────────────────────────────────────

  async getMe(affiliateId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (error || !data) throw new NotFoundException('Affiliate not found');
    return data;
  }

  async updateMe(affiliateId: string, dto: UpdateAffiliateDto) {
    const admin = this.supabaseService.getAdminClient();
    const update: Record<string, unknown> = {};
    if (dto.firstName !== undefined) update.first_name = dto.firstName;
    if (dto.lastName !== undefined) update.last_name = dto.lastName;
    if (dto.phone !== undefined) update.phone = dto.phone;

    const { data, error } = await admin
      .from('affiliates')
      .update(update)
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────

  async getDashboard(affiliateId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Get affiliate info
    const { data: affiliate } = await admin
      .from('affiliates')
      .select('referral_code, first_name, last_name, email')
      .eq('id', affiliateId)
      .single();

    // Count all referrals
    const { count: totalReferred } = await admin
      .from('affiliate_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_id', affiliateId);

    // Count converted (active subscribers)
    const { count: totalConverted } = await admin
      .from('affiliate_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_id', affiliateId)
      .eq('status', 'converted');

    // Sum commissions
    const { data: commissionTotals } = await admin
      .from('affiliate_commissions')
      .select('commission_amount, status')
      .eq('affiliate_id', affiliateId);

    const totalEarned = (commissionTotals ?? []).reduce(
      (sum, c) => sum + Number(c.commission_amount),
      0,
    );
    const pendingEarnings = (commissionTotals ?? [])
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    return {
      affiliate,
      stats: {
        totalReferred: totalReferred ?? 0,
        totalConverted: totalConverted ?? 0,
        totalEarned: Number(totalEarned.toFixed(2)),
        pendingEarnings: Number(pendingEarnings.toFixed(2)),
      },
    };
  }

  // ─── Referrals ───────────────────────────────────────────────────────────

  async getReferrals(affiliateId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('affiliate_referrals')
      .select(
        `
        id,
        status,
        converted_at,
        commission_expires_at,
        created_at,
        owner_accounts!inner(
          id,
          business_name,
          subscription_status
        )
      `,
      )
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  // ─── Commissions ─────────────────────────────────────────────────────────

  async getCommissions(affiliateId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('affiliate_commissions')
      .select(
        `
        id,
        commission_type,
        commission_rate,
        subscription_amount,
        commission_amount,
        status,
        period_start,
        period_end,
        created_at,
        owner_accounts!inner(business_name)
      `,
      )
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  // ─── Commission Processing (called from StripeService) ────────────────────

  /**
   * Process a conversion commission when an owner first subscribes.
   * Creates/updates the referral record to 'converted' and issues a 50% commission.
   */
  async processConversionCommission(
    ownerAccountId: string,
    stripeSubscriptionId: string,
    amountDollars: number,
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();

    // Find the owner's referral
    const { data: owner } = await admin
      .from('owner_accounts')
      .select('referred_by_affiliate_id')
      .eq('id', ownerAccountId)
      .single();

    if (!owner?.referred_by_affiliate_id) return;

    const affiliateId = owner.referred_by_affiliate_id;
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + MAX_COMMISSION_YEARS);

    // Upsert referral row as 'converted'
    const { data: referral, error: refError } = await admin
      .from('affiliate_referrals')
      .upsert(
        {
          affiliate_id: affiliateId,
          owner_account_id: ownerAccountId,
          status: 'converted',
          converted_at: now.toISOString(),
          commission_expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'affiliate_id,owner_account_id' },
      )
      .select()
      .single();

    if (refError) {
      console.error(
        '[AffiliatesService] Failed to upsert referral:',
        refError.message,
      );
      return;
    }

    // Check if a conversion commission already exists for this subscription
    const { data: existing } = await admin
      .from('affiliate_commissions')
      .select('id')
      .eq('referral_id', referral.id)
      .eq('commission_type', 'conversion')
      .maybeSingle();

    if (existing) return; // Already recorded

    const commissionAmount = Number(
      (amountDollars * CONVERSION_RATE).toFixed(2),
    );

    await admin.from('affiliate_commissions').insert({
      affiliate_id: affiliateId,
      referral_id: referral.id,
      owner_account_id: ownerAccountId,
      stripe_subscription_id: stripeSubscriptionId,
      subscription_amount: amountDollars,
      commission_rate: CONVERSION_RATE,
      commission_amount: commissionAmount,
      commission_type: 'conversion',
      status: 'pending',
    });
  }

  /**
   * Process a recurring commission on each subsequent subscription payment.
   * Only applies if referral is within the 3-year window.
   */
  async processRecurringCommission(
    ownerAccountId: string,
    stripeInvoiceId: string,
    stripeSubscriptionId: string,
    amountDollars: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();

    // Load referral
    const { data: referral } = await admin
      .from('affiliate_referrals')
      .select('id, affiliate_id, status, commission_expires_at')
      .eq('owner_account_id', ownerAccountId)
      .eq('status', 'converted')
      .maybeSingle();

    if (!referral) return;

    // Check commission window is still active
    if (
      referral.commission_expires_at &&
      new Date() > new Date(referral.commission_expires_at)
    ) {
      return;
    }

    // Avoid double-recording the same invoice
    const { data: existing } = await admin
      .from('affiliate_commissions')
      .select('id')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .maybeSingle();

    if (existing) return;

    const commissionAmount = Number(
      (amountDollars * RECURRING_RATE).toFixed(2),
    );

    await admin.from('affiliate_commissions').insert({
      affiliate_id: referral.affiliate_id,
      referral_id: referral.id,
      owner_account_id: ownerAccountId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_subscription_id: stripeSubscriptionId,
      subscription_amount: amountDollars,
      commission_rate: RECURRING_RATE,
      commission_amount: commissionAmount,
      commission_type: 'recurring',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status: 'pending',
    });
  }

  // ─── Sales Manager: All-users view ──────────────────────────────────────

  /**
   * Only available to the sales@eventecos.com manager account.
   * Returns all owner accounts with subscription status, sign-up date,
   * last login, and which affiliate (if any) referred them.
   */
  async getManagerUsers(affiliateEmail: string, search = '', roleFilter = '') {
    if (affiliateEmail !== 'sales@eventecos.com') {
      throw new ForbiddenException('Manager access only');
    }

    const admin = this.supabaseService.getAdminClient();

    // Fetch all platform users (exclude customers and affiliates from main view)
    const INCLUDED_ROLES = ['owner', 'promoter', 'artist', 'vendor'];

    let usersQuery = admin
      .from('users')
      .select(
        'id, email, first_name, last_name, role, roles, last_sign_in_at, created_at',
      )
      .in('role', INCLUDED_ROLES)
      .order('created_at', { ascending: false });

    if (roleFilter && roleFilter !== 'all') {
      usersQuery = admin
        .from('users')
        .select(
          'id, email, first_name, last_name, role, roles, last_sign_in_at, created_at',
        )
        .eq('role', roleFilter)
        .order('created_at', { ascending: false });
    }

    const { data: allUsers, error } = await usersQuery;
    if (error) throw new BadRequestException(error.message);

    // For owners — fetch owner_accounts to get subscription info
    const ownerIds = (allUsers || [])
      .filter((u: any) => u.role === 'owner')
      .map((u: any) => u.id);

    const { data: accounts } = ownerIds.length
      ? await admin
          .from('owner_accounts')
          .select(
            'primary_owner_id, business_name, subscription_status, trial_ends_at, referred_by_affiliate_id',
          )
          .in('primary_owner_id', ownerIds)
      : { data: [] };

    const accountMap = new Map(
      (accounts || []).map((a: any) => [a.primary_owner_id, a]),
    );

    // Load affiliate names for referred owners
    const affiliateIds = [
      ...new Set(
        (accounts || [])
          .map((a: any) => a.referred_by_affiliate_id)
          .filter(Boolean),
      ),
    ];
    const { data: affiliates } = affiliateIds.length
      ? await admin
          .from('affiliates')
          .select('id, first_name, last_name, referral_code')
          .in('id', affiliateIds)
      : { data: [] };
    const affiliateMap = new Map((affiliates || []).map((a: any) => [a.id, a]));

    let enriched = (allUsers || []).map((u: any) => {
      const acct = accountMap.get(u.id) || null;
      const ref = acct
        ? affiliateMap.get(acct.referred_by_affiliate_id) || null
        : null;
      return {
        id: u.id,
        email: u.email ?? null,
        first_name: u.first_name ?? null,
        last_name: u.last_name ?? null,
        role: u.role,
        business_name: acct?.business_name ?? null,
        subscription_status: acct?.subscription_status ?? null,
        trial_ends_at: acct?.trial_ends_at ?? null,
        account_created_at: u.created_at,
        last_login: u.last_sign_in_at ?? null,
        referred_by: ref
          ? {
              name: `${ref.first_name} ${ref.last_name}`,
              code: ref.referral_code,
            }
          : null,
      };
    });

    if (search) {
      const s = search.toLowerCase();
      enriched = enriched.filter(
        (r: any) =>
          r.email?.toLowerCase().includes(s) ||
          r.first_name?.toLowerCase().includes(s) ||
          r.last_name?.toLowerCase().includes(s) ||
          r.business_name?.toLowerCase().includes(s),
      );
    }

    // Summary counts by role
    const [
      { count: totalOwners },
      { count: totalPromoters },
      { count: totalArtists },
      { count: totalVendors },
    ] = await Promise.all([
      admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner'),
      admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'promoter'),
      admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'artist'),
      admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'vendor'),
    ]);

    return {
      users: enriched,
      summary: {
        total:
          (totalOwners ?? 0) +
          (totalPromoters ?? 0) +
          (totalArtists ?? 0) +
          (totalVendors ?? 0),
        owners: totalOwners ?? 0,
        promoters: totalPromoters ?? 0,
        artists: totalArtists ?? 0,
        vendors: totalVendors ?? 0,
      },
    };
  }

  /**
   * Only available to the sales@eventecos.com manager account.
   * Returns full profile detail for a single platform user, including
   * role-specific stats (events/revenue for owners, bookings for vendors).
   */
  async getManagerUserDetail(affiliateEmail: string, userId: string) {
    if (affiliateEmail !== 'sales@eventecos.com') {
      throw new ForbiddenException('Manager access only');
    }

    const admin = this.supabaseService.getAdminClient();

    const { data: user, error: userError } = await admin
      .from('users')
      .select(
        'id, email, first_name, last_name, role, roles, created_at, last_sign_in_at',
      )
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw new BadRequestException(userError.message);
    if (!user) throw new NotFoundException('User not found');

    let account: any = null;
    let referredBy: { name: string; code: string } | null = null;
    let stats: Record<string, any> = {};

    if (user.role === 'owner') {
      const [{ data: acct }, { count: eventCount }, { data: invoices }] =
        await Promise.all([
          admin
            .from('owner_accounts')
            .select('*')
            .eq('primary_owner_id', userId)
            .maybeSingle(),
          admin
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', userId),
          admin
            .from('invoices')
            .select('total_amount, status')
            .eq('owner_id', userId),
        ]);

      account = acct;
      const totalRevenue = (invoices || [])
        .filter((i: any) => i.status === 'paid')
        .reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);

      stats = {
        eventCount: eventCount || 0,
        invoiceCount: (invoices || []).length,
        totalRevenue,
      };

      if (acct?.referred_by_affiliate_id) {
        const { data: ref } = await admin
          .from('affiliates')
          .select('first_name, last_name, referral_code')
          .eq('id', acct.referred_by_affiliate_id)
          .maybeSingle();
        if (ref)
          referredBy = {
            name: `${ref.first_name} ${ref.last_name}`,
            code: ref.referral_code,
          };
      }
    } else if (user.role === 'vendor') {
      const { data: acct } = await admin
        .from('vendor_accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      account = acct;

      if (acct?.id) {
        const [{ count: bookingCount }, { data: invoices }] = await Promise.all(
          [
            admin
              .from('vendor_bookings')
              .select('*', { count: 'exact', head: true })
              .eq('vendor_account_id', acct.id),
            admin
              .from('vendor_invoices')
              .select('total_amount, status')
              .eq('vendor_account_id', acct.id),
          ],
        );

        const totalRevenue = (invoices || [])
          .filter((i: any) => i.status === 'paid')
          .reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);

        stats = {
          bookingCount: bookingCount || 0,
          invoiceCount: (invoices || []).length,
          totalRevenue,
        };
      }
    }

    return {
      user,
      account,
      referred_by: referredBy,
      stats,
    };
  }

  // ─── Sales Manager: All-affiliates view ─────────────────────────────────

  async getManagerAffiliates(affiliateEmail: string) {
    if (affiliateEmail !== 'sales@eventecos.com') {
      throw new ForbiddenException('Manager access only');
    }

    const admin = this.supabaseService.getAdminClient();

    const { data: affiliates, error } = await admin
      .from('affiliates')
      .select(
        'id, first_name, last_name, email, referral_code, status, created_at',
      )
      .neq('email', 'sales@eventecos.com')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const affiliateIds = (affiliates ?? []).map((a: any) => a.id);

    if (!affiliateIds.length) return { affiliates: [] };

    const [{ data: referrals }, { data: commissions }] = await Promise.all([
      admin
        .from('affiliate_referrals')
        .select('affiliate_id, status')
        .in('affiliate_id', affiliateIds),
      admin
        .from('affiliate_commissions')
        .select('affiliate_id, commission_amount, status')
        .in('affiliate_id', affiliateIds),
    ]);

    const enriched = (affiliates ?? []).map((a: any) => {
      const refs = (referrals ?? []).filter(
        (r: any) => r.affiliate_id === a.id,
      );
      const comms = (commissions ?? []).filter(
        (c: any) => c.affiliate_id === a.id,
      );
      return {
        id: a.id,
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        referral_code: a.referral_code,
        status: a.status,
        joined_at: a.created_at,
        stats: {
          totalReferred: refs.length,
          totalConverted: refs.filter((r: any) => r.status === 'converted')
            .length,
          totalEarned: Number(
            comms
              .reduce((s: number, c: any) => s + Number(c.commission_amount), 0)
              .toFixed(2),
          ),
          pendingEarnings: Number(
            comms
              .filter((c: any) => c.status === 'pending')
              .reduce((s: number, c: any) => s + Number(c.commission_amount), 0)
              .toFixed(2),
          ),
        },
      };
    });

    return { affiliates: enriched };
  }

  // ─── Referral Code Lookup ─────────────────────────────────────────────────

  /** Validate a referral code and return the affiliate ID (used during owner signup). */
  async getAffiliateIdByCode(code: string): Promise<string | null> {
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('affiliates')
      .select('id')
      .eq('referral_code', code.toUpperCase())
      .eq('status', 'active')
      .maybeSingle();

    return data?.id ?? null;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async generateReferralCode(
    firstName: string,
    admin: any,
  ): Promise<string> {
    const base = firstName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    let code: string;
    let attempts = 0;

    do {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      code = `${base}-${suffix}`;
      const { data: existing } = await admin
        .from('affiliates')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle();

      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    return code!;
  }
}
