import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { Booking } from '../entities/booking.entity';

/**
 * BookingsService — booking table removed.
 * "Bookings" are now just events where payment_status = deposit_paid | paid.
 * All reads/writes go to the `event` table directly.
 */
@Injectable()
export class BookingsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {}

  async findAll(supabase: SupabaseClient, venueId?: string): Promise<any[]> {
    console.log('Fetching bookings (from event table)...');
    const admin = this.supabaseService.getAdminClient();

    let query = admin
      .from('event')
      .select('*, intake_form:intake_forms!intake_form_id(contact_name, contact_phone, event_name, event_type)')
      .in('client_status', ['deposit_paid', 'completed'])
      .order('date', { ascending: false });

    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
    console.log('Bookings fetched:', data?.length || 0);
    return data || [];
  }

  async findOne(supabase: SupabaseClient, id: string): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event')
      .select('*, intake_form:intake_forms!intake_form_id(contact_name, contact_phone, contact_email, event_name, event_type)')
      .eq('id', id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) throw new NotFoundException(`Event/Booking ${id} not found`);
    return data;
  }

  async create(supabase: SupabaseClient, booking: Partial<Booking>): Promise<any> {
    const { data, error } = await supabase
      .from('event')
      .insert([booking])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(supabase: SupabaseClient, id: string, booking: Partial<any>): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event')
      .update(booking)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // SMS notification when status moves to confirmed
    if (booking.client_status === 'deposit_paid' || booking.status === 'confirmed') {
      try {
        const phone = data?.contact_phone || data?.intake_form?.contact_phone;
        const name = data?.contact_name || data?.intake_form?.contact_name || 'Valued Client';
        const eventName = data?.name || 'your event';
        if (phone) {
          await this.smsNotifications.vendorBookingStatusChanged(phone, name, eventName, 'confirmed', false);
        }
      } catch {
        // SMS errors must never break the update
      }
    }

    return data;
  }

  /**
   * Cancel an event (was: cancel booking).
   */
  async cancelBooking(supabase: SupabaseClient, id: string): Promise<{ success: boolean }> {
    const admin = this.supabaseService.getAdminClient();

    const { data: event, error: fetchErr } = await admin
      .from('event')
      .select('id, contact_phone, contact_name, intake_form_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !event) throw new NotFoundException('Event not found');

    const { error: cancelErr } = await admin
      .from('event')
      .update({ status: 'cancelled', client_confirmation_status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id);

    if (cancelErr) throw new BadRequestException(cancelErr.message);

    // Resolve phone from intake_form if not directly on event
    let phone = event.contact_phone;
    if (!phone && event.intake_form_id) {
      const { data: form } = await admin.from('intake_forms').select('contact_phone').eq('id', event.intake_form_id).maybeSingle();
      phone = form?.contact_phone;
    }

    await this.createClientNotification(admin, {
      clientPhone: phone,
      eventId: id,
      type: 'booking',
      message: `Your event has been cancelled by the event organiser.`,
    });

    return { success: true };
  }

  async remove(supabase: SupabaseClient, id: string): Promise<void> {
    await this.cancelBooking(supabase, id);
  }

  /**
   * Create a notification row in the notifications table for a client.
   * Silently ignores errors so it never breaks the main flow.
   */
  private async createClientNotification(
    supabase: SupabaseClient,
    params: { clientPhone?: string | null; eventId?: string | null; type: string; message: string },
  ) {
    try {
      if (!params.clientPhone) return;
      // Look up User ID by phone so notification appears in their portal
      const digits = params.clientPhone.replace(/\D/g, '').slice(-10);
      const variants = [params.clientPhone, digits, `1${digits}`, `+1${digits}`];
      let userId: string | null = null;
      for (const v of variants) {
        const { data: u } = await supabase.from('users').select('id').eq('phone_number', v).maybeSingle();
        if (u) { userId = u.id; break; }
      }
      if (!userId) return; // phone-only clients have no users row — skip
      await supabase.from('notifications').insert({
        user_id: userId,
        event_id: params.eventId ?? null,
        type: params.type,
        message: params.message,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[createClientNotification] failed:', (err as any)?.message);
    }
  }

  /**
   * Resend client confirmation — now targets the event table.
   */
  async resendClientConfirmation(eventId: string): Promise<{ success: boolean; message: string }> {
    const admin = this.supabaseService.getAdminClient();

    const { data: event, error: fetchErr } = await admin
      .from('event')
      .select('id, client_confirmation_status, contact_phone, intake_form_id')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchErr || !event) throw new NotFoundException('Event not found.');

    let phone = event.contact_phone;
    if (!phone && event.intake_form_id) {
      const { data: form } = await admin.from('intake_forms').select('contact_phone').eq('id', event.intake_form_id).maybeSingle();
      phone = form?.contact_phone;
    }

    if (!phone) throw new BadRequestException('This event has no client phone number to notify.');
    if (event.client_confirmation_status === 'confirmed') throw new BadRequestException('Client has already confirmed.');

    const { error } = await admin.from('event').update({ client_confirmation_status: 'pending' }).eq('id', eventId);
    if (error) throw new BadRequestException(error.message);

    return { success: true, message: 'Event notification resent to client.' };
  }
}
