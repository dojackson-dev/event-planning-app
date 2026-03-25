import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class BookingsService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async findAll(supabase: SupabaseClient): Promise<Booking[]> {
    console.log('Fetching bookings...');
    const { data, error } = await supabase
      .from('booking')
      .select(`
        *,
        event:event(id, name, date, start_time, end_time, venue, location, status)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
    console.log('Bookings fetched:', data?.length || 0);
    return data || [];
  }

  async findOne(supabase: SupabaseClient, id: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('booking')
      .select(`
        *,
        event:event(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(supabase: SupabaseClient, booking: Partial<Booking>): Promise<Booking> {
    const { data, error } = await supabase
      .from('booking')
      .insert([booking])
      .select()
      .single();

    if (error) throw error;
    // Fire-and-forget conflict check + notifications
    try {
      await this.checkForConflicts(supabase, data);
    } catch (err) {
      console.error('Error checking booking conflicts:', err?.message || err);
    }

    return data;
  }

  async update(supabase: SupabaseClient, id: string, booking: Partial<Booking>): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('booking')
      .update(booking)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    try {
      await this.checkForConflicts(supabase, data);
    } catch (err) {
      console.error('Error checking booking conflicts:', err?.message || err);
    }

    return data;
  }

  /**
   * Soft-cancel a booking (sets status = 'cancelled', client_confirmation_status = 'cancelled').
   * Cancels the linked event and inserts a notification so the client knows.
   */
  async cancelBooking(supabase: SupabaseClient, id: string): Promise<{ success: boolean }> {
    const supabaseAdmin = this.supabaseService.getAdminClient();

    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('booking')
      .select('id, contact_phone, contact_name, event_id, client_confirmation_status')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !booking) throw new NotFoundException('Booking not found');

    // Cancel the booking
    const { error: cancelErr } = await supabaseAdmin
      .from('booking')
      .update({ status: 'cancelled', client_confirmation_status: 'cancelled' })
      .eq('id', id);

    if (cancelErr) throw new BadRequestException(cancelErr.message);

    // Cancel the linked event
    if (booking.event_id) {
      await supabaseAdmin
        .from('event')
        .update({ status: 'cancelled' })
        .eq('id', booking.event_id);
    }

    // Notify the client
    await this.createClientNotification(supabaseAdmin, {
      clientPhone: booking.contact_phone,
      eventId: booking.event_id,
      type: 'booking',
      message: `Your booking has been cancelled by the event organiser.`,
    });

    return { success: true };
  }

  async remove(supabase: SupabaseClient, id: string): Promise<void> {
    // Soft-cancel rather than hard-delete so client sees cancellation
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
   * Owner resends a client confirmation notification.
   * Resets client_confirmation_status back to 'pending' so the client sees it again.
   */
  async resendClientConfirmation(bookingId: string): Promise<{ success: boolean; message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: booking, error: fetchErr } = await supabase
      .from('booking')
      .select('id, client_confirmation_status, contact_phone')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr || !booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (!booking.contact_phone) {
      throw new BadRequestException('This booking has no client phone number to notify.');
    }

    if (booking.client_confirmation_status === 'confirmed') {
      throw new BadRequestException('Client has already confirmed this booking.');
    }

    const { error } = await supabase
      .from('booking')
      .update({ client_confirmation_status: 'pending' })
      .eq('id', bookingId);

    if (error) throw new BadRequestException(error.message);

    return { success: true, message: 'Event notification resent to client.' };
  }

  // Helper: check for scheduling conflicts for the booking's event and create notifications
  private async checkForConflicts(supabase: SupabaseClient, booking: any) {
    if (!booking) return;

    // Ensure we have event information
    let event = booking.event;
    if (!event && booking.event_id) {
      const { data: e } = await supabase.from('events').select('*').eq('id', booking.event_id).single();
      event = e;
    }
    if (!event) return;

    const eventDate = event.date;
    const venue = event.venue;
    const startA = event.startTime;
    const endA = event.endTime;

    // Fetch other events on same date and venue
    const { data: otherEvents } = await supabase
      .from('events')
      .select('*')
      .eq('date', eventDate)
      .eq('venue', venue)
      .neq('id', event.id);

    if (!otherEvents || otherEvents.length === 0) return;

    const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
      try {
        const toTime = (t: string) => {
          // Normalize HH:MM[:SS]
          const parts = t.split(':').map((p: string) => parseInt(p, 10));
          return (parts[0] || 0) * 60 + (parts[1] || 0);
        };
        const as = toTime(aStart);
        const ae = toTime(aEnd);
        const bs = toTime(bStart);
        const be = toTime(bEnd);
        return Math.max(as, bs) < Math.min(ae, be);
      } catch (err) {
        return false;
      }
    };

    const conflicting: any[] = [];
    for (const other of otherEvents) {
      if (other.startTime && other.endTime && overlaps(startA, endA, other.startTime, other.endTime)) {
        conflicting.push(other);
      }
    }

    if (conflicting.length === 0) return;

    // Build a conflict message and insert into messages table for owner and booking user
    const conflictDescriptions = conflicting.map(c => `${c.name || 'Event'} (id:${c.id}) ${c.startTime}-${c.endTime}`).join('; ');
    const messageText = `Scheduling conflict detected for your event "${event.name}" on ${eventDate} at ${startA}-${endA} in ${venue}. Conflicts: ${conflictDescriptions}`;

    try {
      // Attempt to get booking user and event owner
      let bookingUser: any = null;
      if (booking.user_id) {
        const { data: u } = await supabase.from('users').select('*').eq('id', booking.user_id).single();
        bookingUser = u;
      }

      let ownerUser: any = null;
      if (event.ownerId) {
        const { data: o } = await supabase.from('users').select('*').eq('id', event.ownerId).single();
        ownerUser = o;
      }

      const inserts: any[] = [];
      if (ownerUser) {
        inserts.push({
          recipient_phone: ownerUser.phone || null,
          recipient_name: `${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() || null,
          recipient_type: 'client',
          user_id: ownerUser.id || null,
          event_id: event.id || null,
          message_type: 'update',
          content: messageText,
          status: 'pending',
        });
      }
      if (bookingUser && bookingUser.id !== ownerUser?.id) {
        inserts.push({
          recipient_phone: bookingUser.phone || null,
          recipient_name: `${bookingUser.first_name || ''} ${bookingUser.last_name || ''}`.trim() || null,
          recipient_type: 'client',
          user_id: bookingUser.id || null,
          event_id: event.id || null,
          message_type: 'update',
          content: messageText,
          status: 'pending',
        });
      }

      if (inserts.length > 0) {
        await supabase.from('messages').insert(inserts);
      }
    } catch (err) {
      console.error('Failed to create conflict notification messages:', err?.message || err);
    }
  }
}
