import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePromoterDto, UpdatePromoterDto } from './dto/promoter.dto';

@Injectable()
export class PromoterService {
  private readonly logger = new Logger(PromoterService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ─────────────────────────────────────────────
  // PROMOTER ACCOUNT
  // ─────────────────────────────────────────────

  async createPromoterAccount(userId: string, dto: CreatePromoterDto, ownerAccountId?: string | null) {
    const admin = this.supabaseService.getAdminClient();

    const { data: existing } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('Promoter account already exists for this user');
    }

    const { data, error } = await admin
      .from('promoter_accounts')
      .insert({
        user_id: userId,
        owner_account_id: ownerAccountId ?? null,
        company_name: dto.companyName ?? null,
        contact_name: dto.contactName,
        email: dto.email,
        phone: dto.phone ?? null,
        location: dto.location ?? null,
        bio: dto.bio ?? null,
        website: dto.website ?? null,
        instagram: dto.instagram ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Created promoter account ${data.id} for user ${userId}`);

    // Ensure the user's role is set to 'promoter'
    await admin.from('users').update({ role: 'promoter' }).eq('id', userId);

    return data;
  }

  async getPromoterProfile(userId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('promoter_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getPublicProfile(promoterId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data: profile, error } = await admin
      .from('promoter_accounts')
      .select('id, company_name, contact_name, location, bio, website, instagram, profile_image_url, cover_image_url')
      .eq('id', promoterId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !profile) throw new NotFoundException('Promoter not found');

    const { data: events } = await admin
      .from('public_events')
      .select('id, title, event_date, start_time, venue_name, city, state, category, image_url, ticket_tiers(id, name, price, quantity, quantity_sold)')
      .eq('promoter_account_id', promoterId)
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    return { profile, events: events || [] };
  }

  async updatePromoterProfile(userId: string, dto: UpdatePromoterDto) {
    const admin = this.supabaseService.getAdminClient();

    const { data: promoter } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!promoter) throw new NotFoundException('Promoter account not found');

    const { data, error } = await admin
      .from('promoter_accounts')
      .update({
        ...(dto.companyName !== undefined && { company_name: dto.companyName }),
        ...(dto.contactName !== undefined && { contact_name: dto.contactName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.instagram !== undefined && { instagram: dto.instagram }),
        ...(dto.profileImageUrl !== undefined && { profile_image_url: dto.profileImageUrl }),
        ...(dto.coverImageUrl !== undefined && { cover_image_url: dto.coverImageUrl }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', promoter.id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getDashboardStats(userId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data: promoter } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!promoter) return { totalEvents: 0, publishedEvents: 0, totalTicketsSold: 0, totalRevenue: 0 };

    const { data: events } = await admin
      .from('public_events')
      .select('id, status')
      .eq('promoter_account_id', promoter.id);

    const totalEvents = events?.length ?? 0;
    const publishedEvents = events?.filter((e: any) => e.status === 'published').length ?? 0;

    const eventIds = events?.map((e: any) => e.id) ?? [];
    if (eventIds.length === 0) {
      return { totalEvents, publishedEvents, totalTicketsSold: 0, totalRevenue: 0 };
    }

    const { data: tickets } = await admin
      .from('tickets')
      .select('amount_paid, status')
      .in('public_event_id', eventIds)
      .in('status', ['valid', 'checked_in']);

    const totalTicketsSold = tickets?.length ?? 0;
    const totalRevenue = tickets?.reduce((sum: number, t: any) => sum + Number(t.amount_paid ?? 0), 0) ?? 0;

    return { totalEvents, publishedEvents, totalTicketsSold, totalRevenue };
  }

  // ─────────────────────────────────────────────
  // OWNER ENABLING PROMOTER MODE
  // ─────────────────────────────────────────────

  async enablePromoterMode(userId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Get user info
    const { data: user } = await admin
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('User not found');

    // Get owner account
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    const ownerAccountId = membership?.owner_account_id ?? null;

    // Check if promoter account already exists
    const { data: existing } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return { promoterAccount: existing, alreadyExisted: true };
    }

    const dto: CreatePromoterDto = {
      contactName: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Promoter',
      email: user.email,
    };

    const promoterAccount = await this.createPromoterAccount(userId, dto, ownerAccountId);
    return { promoterAccount, alreadyExisted: false };
  }

  // ─────────────────────────────────────────────
  // PLAN
  // ─────────────────────────────────────────────

  async updatePlan(userId: string, plan: string) {
    const VALID_PLANS = ['free', 'pro', 'premium'];
    if (!VALID_PLANS.includes(plan)) {
      throw new BadRequestException(`Invalid plan "${plan}". Must be one of: ${VALID_PLANS.join(', ')}`);
    }
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_accounts')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('id, plan')
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Promoter account not found');
    return data;
  }

  // ─────────────────────────────────────────────
  // BOOKING LINKS
  // ─────────────────────────────────────────────

  private async generateShortCode(admin: any): Promise<string> {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      const { data } = await admin
        .from('promoter_booking_links')
        .select('id')
        .eq('short_code', code)
        .maybeSingle();
      if (!data) return code;
    }
    throw new Error('Could not generate a unique short code');
  }

  async upsertBookingLink(userId: string, dto: { slug: string; isActive?: boolean; customMessage?: string }) {
    const admin = this.supabaseService.getAdminClient();

    if (!/^[a-z0-9-]{3,60}$/.test(dto.slug)) {
      throw new BadRequestException('Slug must be 3-60 characters: lowercase letters, numbers, and hyphens only');
    }

    const { data: promoter } = await admin
      .from('promoter_accounts').select('id').eq('user_id', userId).maybeSingle();
    if (!promoter) throw new BadRequestException('No promoter account found');

    const { data: conflict } = await admin
      .from('promoter_booking_links').select('id, promoter_account_id').eq('slug', dto.slug).maybeSingle();
    if (conflict && conflict.promoter_account_id !== promoter.id) {
      throw new BadRequestException('This slug is already taken');
    }

    const { data: existing } = await admin
      .from('promoter_booking_links').select('id, short_code').eq('promoter_account_id', promoter.id).maybeSingle();

    const shortCode = existing?.short_code ?? await this.generateShortCode(admin);
    const payload = {
      promoter_account_id: promoter.id,
      slug: dto.slug,
      short_code: shortCode,
      is_active: dto.isActive ?? true,
      custom_message: dto.customMessage ?? null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await admin
        .from('promoter_booking_links').update(payload).eq('id', existing.id).select().single();
      if (error) throw new BadRequestException(error.message);
      return data;
    } else {
      const { data, error } = await admin
        .from('promoter_booking_links').insert(payload).select().single();
      if (error) throw new BadRequestException(error.message);
      return data;
    }
  }

  async getMyBookingLink(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: promoter } = await admin
      .from('promoter_accounts').select('id').eq('user_id', userId).maybeSingle();
    if (!promoter) return null;
    const { data } = await admin
      .from('promoter_booking_links').select('*').eq('promoter_account_id', promoter.id).maybeSingle();
    return data ?? null;
  }

  async getPublicBookingLink(slug: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_booking_links')
      .select('*, promoter_accounts(company_name, contact_name, location, bio, profile_image_url)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    if (error || !data) throw new NotFoundException('Booking link not found or inactive');
    return data;
  }

  async getPublicBookingLinkByShortCode(code: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_booking_links').select('slug').eq('short_code', code).eq('is_active', true).single();
    if (error || !data) throw new NotFoundException('Booking link not found or inactive');
    return { slug: data.slug };
  }

  async submitBookingRequest(slug: string, dto: any) {
    const admin = this.supabaseService.getAdminClient();
    const { data: link } = await admin
      .from('promoter_booking_links').select('id, promoter_account_id, is_active').eq('slug', slug).single();
    if (!link || !link.is_active) throw new NotFoundException('Booking link not found or inactive');

    const { data, error } = await admin
      .from('promoter_booking_requests')
      .insert({
        promoter_account_id: link.promoter_account_id,
        booking_link_id: link.id,
        client_name: dto.clientName,
        client_email: dto.clientEmail,
        client_phone: dto.clientPhone ?? null,
        sms_opt_in: dto.smsOptIn ?? false,
        event_name: dto.eventName ?? null,
        event_date: dto.eventDate ?? null,
        start_time: dto.startTime ?? null,
        end_time: dto.endTime ?? null,
        venue_name: dto.venueName ?? null,
        venue_address: dto.venueAddress ?? null,
        notes: dto.notes ?? null,
      })
      .select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getPromoterBookingRequests(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: promoter } = await admin
      .from('promoter_accounts').select('id').eq('user_id', userId).maybeSingle();
    if (!promoter) return [];
    const { data } = await admin
      .from('promoter_booking_requests')
      .select('*')
      .eq('promoter_account_id', promoter.id)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async updatePromoterBookingRequest(userId: string, requestId: string, status: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: promoter } = await admin
      .from('promoter_accounts').select('id').eq('user_id', userId).maybeSingle();
    if (!promoter) throw new BadRequestException('No promoter account found');

    const { data, error } = await admin
      .from('promoter_booking_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('promoter_account_id', promoter.id)
      .select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
