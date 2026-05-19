import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { CreatePromoterBookingDto, UpdatePromoterBookingDto } from './dto/promoter-booking.dto';

@Injectable()
export class PromoterBookingsService {
  private readonly logger = new Logger(PromoterBookingsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

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
        artist_account_id: dto.artist_account_id ?? null,
        artist_name: dto.artist_name ?? null,
        status: 'inquiry',
      })
      .select('*, promoter_invoices(invoice_number, total_amount, status), artist_accounts(id, artist_name, stage_name, artist_type)')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create booking');
    return data;
  }

  async listBookings(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    let promoterAccountId: string;
    try {
      promoterAccountId = await this.getPromoterAccountId(userId);
    } catch {
      return [];
    }

    const { data, error } = await admin
      .from('promoter_bookings')
      .select('*, promoter_invoices(invoice_number, total_amount, status), artist_accounts(id, artist_name, stage_name, artist_type)')
      .eq('promoter_account_id', promoterAccountId)
      .order('event_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getBooking(userId: string, bookingId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Fetch the booking first without user filtering
    const { data, error } = await admin
      .from('promoter_bookings')
      .select('*, promoter_invoices(id, invoice_number, total_amount, amount_due, status, public_token), artist_accounts(id, artist_name, stage_name, artist_type, booking_email, booking_phone, performance_fee_min, performance_fee_max), promoter_accounts(company_name, contact_name, email, phone)')
      .eq('id', bookingId)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Booking not found');

    // Allow access if user is the promoter who owns it
    const { data: promoterAccount } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    const isPromoter = promoterAccount && promoterAccount.id === data.promoter_account_id;

    // Allow access if user is the artist on this booking
    const { data: artistAccount } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    const isArtist = artistAccount && artistAccount.id === data.artist_account_id;

    if (!isPromoter && !isArtist) throw new ForbiddenException('Access denied');

    // Fetch artist invoices sent by the booked artist (payable by the promoter)
    let artistInvoices: any[] = [];
    if (data.artist_account_id) {
      const { data: aiData } = await admin
        .from('artist_invoices')
        .select('id, invoice_number, total_amount, amount_due, amount_paid, status, public_token, issue_date, due_date, created_at')
        .eq('artist_account_id', data.artist_account_id)
        .order('created_at', { ascending: false });
      artistInvoices = aiData ?? [];
    }

    return { ...data, artist_invoices: artistInvoices };
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

  async listArtistInvoicesForPromoter(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoterAccountId = await this.getPromoterAccountId(userId);

    // Find all artist_account_ids this promoter has booked
    const { data: bookings } = await admin
      .from('promoter_bookings')
      .select('artist_account_id')
      .eq('promoter_account_id', promoterAccountId)
      .not('artist_account_id', 'is', null);

    const artistIds = Array.from(
      new Set((bookings ?? []).map((b: any) => b.artist_account_id).filter(Boolean)),
    );
    if (artistIds.length === 0) return [];

    const { data, error } = await admin
      .from('artist_invoices')
      .select(
        'id, invoice_number, total_amount, amount_due, amount_paid, status, public_token, issue_date, due_date, created_at, artist_account_id, artist_accounts(artist_name, stage_name)',
      )
      .in('artist_account_id', artistIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async listBookingsForArtist(userId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Look up artist_account_id for this user
    const { data: artistAccount } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!artistAccount) return [];

    const { data, error } = await admin
      .from('promoter_bookings')
      .select('*, promoter_accounts(company_name, contact_name, email, phone)')
      .eq('artist_account_id', artistAccount.id)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async artistRespondToBooking(userId: string, bookingId: string, action: 'accept' | 'decline') {
    const admin = this.supabaseService.getAdminClient();

    const { data: artistAccount } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!artistAccount) throw new ForbiddenException('No artist account found for this user');

    const { data: booking } = await admin
      .from('promoter_bookings')
      .select('id, status')
      .eq('id', bookingId)
      .eq('artist_account_id', artistAccount.id)
      .maybeSingle();
    if (!booking) throw new NotFoundException('Booking not found or not assigned to you');

    if (action === 'accept' && booking.status === 'confirmed') {
      throw new BadRequestException('Booking is already confirmed');
    }

    const newStatus = action === 'accept' ? 'confirmed' : 'cancelled';

    const { data, error } = await admin
      .from('promoter_bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select('*, promoter_accounts(company_name, contact_name, email, phone)')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async sendRiderToPromoter(artistUserId: string, bookingId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Verify artist owns an account
    const { data: artistAccount } = await admin
      .from('artist_accounts')
      .select('id, artist_name, stage_name')
      .eq('user_id', artistUserId)
      .maybeSingle();
    if (!artistAccount) throw new ForbiddenException('No artist account found');

    // Verify artist is on this booking
    const { data: booking } = await admin
      .from('promoter_bookings')
      .select('id, event_name, event_date, promoter_accounts(contact_name, company_name, email)')
      .eq('id', bookingId)
      .eq('artist_account_id', artistAccount.id)
      .maybeSingle();
    if (!booking) throw new NotFoundException('Booking not found or not assigned to you');

    const promoter = (booking as any).promoter_accounts;
    const toEmail = promoter?.email;
    if (!toEmail) throw new BadRequestException('No promoter email on file for this booking');

    // Fetch rider
    const { data: rider } = await admin
      .from('artist_riders')
      .select('*')
      .eq('artist_account_id', artistAccount.id)
      .maybeSingle();
    if (!rider) throw new BadRequestException('You have not set up a rider yet. Go to your rider page to create one.');

    const artistName = (artistAccount as any).stage_name || (artistAccount as any).artist_name || 'Artist';

    try {
      await this.mailService.sendRiderEmail({
        to: toEmail,
        artistName,
        eventName: (booking as any).event_name,
        eventDate: (booking as any).event_date,
        rider,
      });
    } catch (err: any) {
      this.logger.error('sendRiderEmail failed', err);
      throw new BadRequestException(
        `Failed to send rider email: ${err?.message ?? 'SMTP error'}. Check your email configuration.`,
      );
    }

    return { success: true, sentTo: toEmail };
  }
}
