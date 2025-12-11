import { Injectable } from '@nestjs/common';
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
        event:event(*)
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

  async remove(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('booking')
      .delete()
      .eq('id', id);

    if (error) throw error;
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
