import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterAffiliateDto, UpdateAffiliateDto } from './dto/affiliate.dto';
import { randomBytes } from 'crypto';

/** Commission rates */
const CONVERSION_RATE = 0.50;  // 50% of first subscription payment
const RECURRING_RATE  = 0.03;  // 3% of each subsequent payment
const MAX_COMMISSION_YEARS = 3;

@Injectable()
export class AffiliatesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // ─── Registration ────────────────────────────────────────────────────────

  async register(dto: RegisterAffiliateDto) {
    const admin = this.supabaseService.getAdminClient();

    // Check email uniqueness in users table
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('email', dto.email.toLowerCase())
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: false,
      user_metadata: {
        first_name: dto.firstName,
        last_name: dto.lastName,
        role: 'affiliate',
      },
    });

    if (authError || !authData.user) {
      throw new BadRequestException(authError?.message || 'Failed to create user');
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

    // Sign in to get a session for the new affiliate
    const anonClient = this.supabaseService.getClient();
    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
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
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

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
    if (dto.lastName  !== undefined) update.last_name  = dto.lastName;
    if (dto.phone     !== undefined) update.phone       = dto.phone;

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
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    return {
      affiliate,
      stats: {
        totalReferred:   totalReferred   ?? 0,
        totalConverted:  totalConverted  ?? 0,
        totalEarned:     Number(totalEarned.toFixed(2)),
        pendingEarnings: Number(pendingEarnings.toFixed(2)),
      },
    };
  }

  // ─── Referrals ───────────────────────────────────────────────────────────

  async getReferrals(affiliateId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('affiliate_referrals')
      .select(`
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
      `)
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
      .select(`
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
      `)
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
          affiliate_id:          affiliateId,
          owner_account_id:      ownerAccountId,
          status:                'converted',
          converted_at:          now.toISOString(),
          commission_expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'affiliate_id,owner_account_id' },
      )
      .select()
      .single();

    if (refError) {
      console.error('[AffiliatesService] Failed to upsert referral:', refError.message);
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

    const commissionAmount = Number((amountDollars * CONVERSION_RATE).toFixed(2));

    await admin.from('affiliate_commissions').insert({
      affiliate_id:           affiliateId,
      referral_id:            referral.id,
      owner_account_id:       ownerAccountId,
      stripe_subscription_id: stripeSubscriptionId,
      subscription_amount:    amountDollars,
      commission_rate:        CONVERSION_RATE,
      commission_amount:      commissionAmount,
      commission_type:        'conversion',
      status:                 'pending',
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

    const commissionAmount = Number((amountDollars * RECURRING_RATE).toFixed(2));

    await admin.from('affiliate_commissions').insert({
      affiliate_id:           referral.affiliate_id,
      referral_id:            referral.id,
      owner_account_id:       ownerAccountId,
      stripe_invoice_id:      stripeInvoiceId,
      stripe_subscription_id: stripeSubscriptionId,
      subscription_amount:    amountDollars,
      commission_rate:        RECURRING_RATE,
      commission_amount:      commissionAmount,
      commission_type:        'recurring',
      period_start:           periodStart.toISOString(),
      period_end:             periodEnd.toISOString(),
      status:                 'pending',
    });
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

  private async generateReferralCode(firstName: string, admin: any): Promise<string> {
    const base = firstName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
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
