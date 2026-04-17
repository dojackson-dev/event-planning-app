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
}
