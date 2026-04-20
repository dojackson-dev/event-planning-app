import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePromoterBookingDto, UpdatePromoterBookingDto } from './dto/promoter-booking.dto';

@Injectable()
export class PromoterBookingsService {
  private readonly logger = new Logger(PromoterBookingsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getPromoterAccountId(userId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new ForbiddenException('No promoter account found for this user');
    return data.id;
  }

  async createBooking(userId: string, dto: CreatePromoterBookingDto) {
    const admin = this.supabaseService.getAdminClient();
    const promoterAccountId = await this.getPromoterAccountId(userId);

    const { data, error } = await admin
      .from('promoter_bookings')
      .insert({
        promoter_account_id: promoterAccountId,
        event_name: dto.event_name,
        client_name: dto.client_name,
        client_email: dto.client_email,
        client_phone: dto.client_phone ?? null,
        event_date: dto.event_date ?? null,
        event_start_time: dto.event_start_time ?? null,
        event_end_time: dto.event_end_time ?? null,
        venue_name: dto.venue_name ?? null,
        venue_address: dto.venue_address ?? null,
        agreed_amount: dto.agreed_amount ?? null,
        deposit_amount: dto.deposit_amount ?? null,
        notes: dto.notes ?? null,
        promoter_invoice_id: dto.promoter_invoice_id ?? null,
        status: 'inquiry',
      })
      .select('*, promoter_invoices(invoice_number, total_amount, status)')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create booking');
    return data;
  }

  async listBookings(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoterAccountId = await this.getPromoterAccountId(userId);

    const { data, error } = await admin
      .from('promoter_bookings')
      .select('*, promoter_invoices(invoice_number, total_amount, status)')
      .eq('promoter_account_id', promoterAccountId)
      .order('event_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getBooking(userId: string, bookingId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoterAccountId = await this.getPromoterAccountId(userId);

    const { data, error } = await admin
      .from('promoter_bookings')
      .select('*, promoter_invoices(id, invoice_number, total_amount, amount_due, status, public_token)')
      .eq('id', bookingId)
      .eq('promoter_account_id', promoterAccountId)
      .single();

    if (error || !data) throw new NotFoundException('Booking not found');
    return data;
  }

  async updateBooking(userId: string, bookingId: string, dto: UpdatePromoterBookingDto) {
    const admin = this.supabaseService.getAdminClient();
    const promoterAccountId = await this.getPromoterAccountId(userId);

    const { data: existing } = await admin
      .from('promoter_bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('promoter_account_id', promoterAccountId)
      .single();
    if (!existing) throw new NotFoundException('Booking not found');

    const { error } = await admin
      .from('promoter_bookings')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) throw new Error(error.message);
    return this.getBooking(userId, bookingId);
  }

  async deleteBooking(userId: string, bookingId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoterAccountId = await this.getPromoterAccountId(userId);

    const { error } = await admin
      .from('promoter_bookings')
      .delete()
      .eq('id', bookingId)
      .eq('promoter_account_id', promoterAccountId);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
