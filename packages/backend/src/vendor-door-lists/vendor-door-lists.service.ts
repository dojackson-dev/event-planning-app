import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/** Booking statuses that count as "assigned to the event". */
const ASSIGNED_STATUSES = ['confirmed', 'paid'];

export interface DoorListEvent {
  event_id: string;
  event_name: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  guest_list_id: number | null;
  total_guests: number;
  arrived_guests: number;
}

/** Check-in view of a guest: no phone number or other contact details. */
export interface DoorListGuest {
  id: number;
  name: string;
  plus_one_count: number | null;
  is_vip: boolean | null;
  has_arrived: boolean;
  arrived_at: string | null;
}

/** Copies only the check-in fields, so nothing else can leak even if the query returns more. */
function toDoorListGuest(row: Record<string, unknown>): DoorListGuest {
  return {
    id: row.id as number,
    name: row.name as string,
    plus_one_count: (row.plus_one_count as number | null) ?? null,
    is_vip: (row.is_vip as boolean | null) ?? null,
    has_arrived: Boolean(row.has_arrived),
    arrived_at: (row.arrived_at as string | null) ?? null,
  };
}

const GUEST_COLUMNS =
  'id, name, plus_one_count, is_vip, has_arrived, arrived_at';

@Injectable()
export class VendorDoorListsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getAdminClient();
  }

  /** Door lists are for security vendors only. */
  private async getSecurityVendorId(userId: string): Promise<string> {
    const { data, error } = await this.db
      .from('vendor_accounts')
      .select('id, category, categories')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('Vendor account not found');
    const row = data as {
      id: string;
      category?: string | null;
      categories?: string[] | null;
    };
    const isSecurity =
      row.category === 'security' ||
      (Array.isArray(row.categories) && row.categories.includes('security'));
    if (!isSecurity)
      throw new ForbiddenException(
        'Door lists are available to security vendors.',
      );
    return row.id;
  }

  /** Bookings that tie this vendor to an event the owner assigned them to. */
  private async assignments(vendorId: string) {
    const { data, error } = await this.db
      .from('vendor_bookings')
      .select(
        'event_id, event_name, event_date, start_time, end_time, venue_name',
      )
      .eq('vendor_account_id', vendorId)
      .in('status', ASSIGNED_STATUSES)
      .not('event_id', 'is', null)
      .order('event_date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Array<{
      event_id: string;
      event_name: string | null;
      event_date: string | null;
      start_time: string | null;
      end_time: string | null;
      venue_name: string | null;
    }>;
  }

  private async assertAssigned(vendorId: string, eventId: string) {
    const found = (await this.assignments(vendorId)).find(
      (a) => String(a.event_id) === String(eventId),
    );
    if (!found) throw new NotFoundException('Event not found');
    return found;
  }

  async listEvents(userId: string): Promise<DoorListEvent[]> {
    const vendorId = await this.getSecurityVendorId(userId);
    const assigned = await this.assignments(vendorId);
    if (assigned.length === 0) return [];

    const eventIds = [...new Set(assigned.map((a) => String(a.event_id)))];
    const { data: events } = await this.db
      .from('event')
      .select('id, start_time, end_time')
      .in('id', eventIds);
    const eventTimes = new Map(
      ((events ?? []) as Array<Record<string, string | null>>).map((e) => [
        String(e.id),
        e,
      ]),
    );
    const { data: lists } = await this.db
      .from('guest_lists')
      .select('id, event_id')
      .in('event_id', eventIds);
    const listByEvent = new Map(
      ((lists ?? []) as Array<{ id: number; event_id: string | number }>).map(
        (l) => [String(l.event_id), l.id],
      ),
    );
    const listIds = [...listByEvent.values()];
    const { data: guests } = listIds.length
      ? await this.db
          .from('guests')
          .select('guest_list_id, has_arrived')
          .in('guest_list_id', listIds)
      : { data: [] };
    const counts = new Map<number, { total: number; arrived: number }>();
    for (const g of (guests ?? []) as Array<{
      guest_list_id: number;
      has_arrived: boolean;
    }>) {
      const c = counts.get(g.guest_list_id) ?? { total: 0, arrived: 0 };
      c.total += 1;
      if (g.has_arrived) c.arrived += 1;
      counts.set(g.guest_list_id, c);
    }

    const seen = new Set<string>();
    return assigned
      .filter((a) => {
        const key = String(a.event_id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((a) => {
        const key = String(a.event_id);
        const listId = listByEvent.get(key) ?? null;
        const c = (listId !== null && counts.get(listId)) || {
          total: 0,
          arrived: 0,
        };
        const ev = eventTimes.get(key);
        return {
          event_id: key,
          event_name: a.event_name,
          event_date: a.event_date,
          start_time: a.start_time || ev?.start_time || null,
          end_time: a.end_time || ev?.end_time || null,
          venue_name: a.venue_name,
          guest_list_id: listId,
          total_guests: c.total,
          arrived_guests: c.arrived,
        };
      });
  }

  async getDoorList(
    userId: string,
    eventId: string,
  ): Promise<{ event: DoorListEvent; guests: DoorListGuest[] }> {
    const vendorId = await this.getSecurityVendorId(userId);
    await this.assertAssigned(vendorId, eventId);
    const event = (await this.listEvents(userId)).find(
      (e) => e.event_id === String(eventId),
    );
    if (!event) throw new NotFoundException('Event not found');
    if (event.guest_list_id === null) return { event, guests: [] };
    const { data, error } = await this.db
      .from('guests')
      .select(GUEST_COLUMNS)
      .eq('guest_list_id', event.guest_list_id)
      .order('name', { ascending: true });
    if (error) throw error;
    return {
      event,
      guests: ((data ?? []) as Array<Record<string, unknown>>).map(
        toDoorListGuest,
      ),
    };
  }

  /** Mark a guest arrived (or undo it) - only for an event this vendor is assigned to. */
  async setArrival(
    userId: string,
    guestId: number,
    arrived: boolean,
  ): Promise<DoorListGuest> {
    const vendorId = await this.getSecurityVendorId(userId);
    const { data: guest } = await this.db
      .from('guests')
      .select('id, guest_list_id')
      .eq('id', guestId)
      .maybeSingle();
    if (!guest) throw new NotFoundException('Guest not found');
    const { data: list } = await this.db
      .from('guest_lists')
      .select('event_id')
      .eq('id', (guest as { guest_list_id: number }).guest_list_id)
      .maybeSingle();
    if (!list || (list as { event_id: unknown }).event_id == null)
      throw new NotFoundException('Guest not found');
    await this.assertAssigned(
      vendorId,
      String((list as { event_id: unknown }).event_id),
    ).catch(() => {
      throw new NotFoundException('Guest not found');
    });

    const { data, error } = await this.db
      .from('guests')
      .update({
        has_arrived: arrived,
        arrived_at: arrived ? new Date().toISOString() : null,
      })
      .eq('id', guestId)
      .select(GUEST_COLUMNS)
      .single();
    if (error) throw error;
    return toDoorListGuest(data as Record<string, unknown>);
  }
}
