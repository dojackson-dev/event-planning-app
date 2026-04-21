import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateArtistBookingDto, UpdateArtistBookingDto } from './dto/artist-booking.dto';

@Injectable()
export class ArtistBookingsService {
  private readonly logger = new Logger(ArtistBookingsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ─── Helper ───────────────────────────────────────────────────────────────

  async getArtistAccountId(userId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new ForbiddenException('No artist account found for this user');
    return data.id;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async createBooking(userId: string, dto: CreateArtistBookingDto) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data, error } = await admin
      .from('artist_bookings')
      .insert({
        artist_account_id: artistAccountId,
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
        artist_invoice_id: dto.artist_invoice_id ?? null,
        status: 'inquiry',
      })
      .select('*, artist_invoices(invoice_number, total_amount, status)')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create booking');
    return data;
  }

  async listBookings(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data, error } = await admin
      .from('artist_bookings')
      .select('*, artist_invoices(invoice_number, total_amount, status)')
      .eq('artist_account_id', artistAccountId)
      .order('event_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getBooking(userId: string, bookingId: string) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data, error } = await admin
      .from('artist_bookings')
      .select('*, artist_invoices(id, invoice_number, total_amount, amount_due, status, public_token)')
      .eq('id', bookingId)
      .eq('artist_account_id', artistAccountId)
      .single();

    if (error || !data) throw new NotFoundException('Booking not found');
    return data;
  }

  async updateBooking(userId: string, bookingId: string, dto: UpdateArtistBookingDto) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data: existing } = await admin
      .from('artist_bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('artist_account_id', artistAccountId)
      .single();
    if (!existing) throw new NotFoundException('Booking not found');

    const { error } = await admin
      .from('artist_bookings')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) throw new Error(error.message);
    return this.getBooking(userId, bookingId);
  }

  async deleteBooking(userId: string, bookingId: string) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { error } = await admin
      .from('artist_bookings')
      .delete()
      .eq('id', bookingId)
      .eq('artist_account_id', artistAccountId);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
