import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Overview stats for the client dashboard */
  async getOverview(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();

    const [bookingsRes, contractsRes, estimatesRes] = await Promise.all([
      supabase
        .from('booking')
        .select('id, status, total_price, deposit, payment_status, created_at, event:event(id, name, date, start_time, end_time, venue, status)')
        .or(`user_id.eq.${clientId},contact_phone.eq.${clientPhone}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('contracts')
        .select('id, status, created_at')
        .eq('client_id', clientId),
      supabase
        .from('estimates')
        .select('id, status, total_amount, created_at')
        .eq('client_id', clientId),
    ]);

    return {
      bookings: bookingsRes.data || [],
      contracts: contractsRes.data || [],
      estimates: estimatesRes.data || [],
    };
  }

  /** All bookings for the client including event + vendor info */
  async getBookings(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('booking')
      .select(`
        *,
        event:event(
          id, name, description, date, start_time, end_time, venue, location, max_guests, status, event_type
        )
      `)
      .or(`user_id.eq.${clientId},contact_phone.eq.${clientPhone}`)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('getBookings error', error);
      return [];
    }
    return data || [];
  }

  /** All events linked to this client (via bookings by user_id or contact_phone) */
  async getEvents(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Get all event IDs the client is associated with (by user_id OR phone)
    const { data: bookings, error: bErr } = await supabase
      .from('booking')
      .select('event_id')
      .or(`user_id.eq.${clientId},contact_phone.eq.${clientPhone}`);

    if (bErr || !bookings?.length) return [];

    const eventIds = [...new Set(bookings.map((b: any) => b.event_id))];

    const { data: events, error: eErr } = await supabase
      .from('event')
      .select('*')
      .in('id', eventIds)
      .order('date', { ascending: true });

    if (eErr) {
      this.logger.error('getEvents error', eErr);
      return [];
    }
    return events || [];
  }

  /** Vendors booked for this client's events, plus any vendors the client booked directly */
  async getVendors(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Get event IDs from all bookings associated with this client (by user_id OR phone)
    const { data: bookings } = await supabase
      .from('booking')
      .select('event_id')
      .or(`user_id.eq.${clientId},contact_phone.eq.${clientPhone}`);

    const eventIds = [...new Set((bookings || []).map((b: any) => b.event_id).filter(Boolean))];

    const vendorSelect = `
      *,
      vendor:vendor_accounts(
        id, business_name, category, city, state, phone, email, website, instagram,
        bio, hourly_rate, flat_rate, rate_description, is_verified, profile_image_url
      )
    `;

    // Run both queries in parallel: event-linked vendors and direct client bookings
    const [eventVendorsRes, directVendorsRes] = await Promise.all([
      eventIds.length
        ? supabase
            .from('vendor_bookings')
            .select(vendorSelect)
            .in('event_id', eventIds)
            .in('status', ['confirmed', 'pending', 'completed'])
            .order('created_at', { ascending: false })
        : { data: [] as any[], error: null },
      supabase
        .from('vendor_bookings')
        .select(vendorSelect)
        .eq('client_user_id', clientId)
        .order('created_at', { ascending: false }),
    ]);

    if (eventVendorsRes.error) {
      this.logger.error('getVendors (event) error', eventVendorsRes.error);
    }
    if (directVendorsRes.error) {
      this.logger.error('getVendors (direct) error', directVendorsRes.error);
    }

    // Merge and deduplicate by id
    const combined = [
      ...(eventVendorsRes.data || []),
      ...(directVendorsRes.data || []),
    ];
    const seen = new Set<string>();
    return combined.filter((b: any) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }

  /** Book a vendor directly from the client portal */
  async bookVendor(
    clientId: string,
    clientPhone: string,
    clientName: string,
    dto: {
      vendorAccountId: string;
      eventName: string;
      eventDate: string;
      startTime?: string;
      endTime?: string;
      venueName?: string;
      venueAddress?: string;
      notes?: string;
    },
  ) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: vendor } = await supabase
      .from('vendor_accounts')
      .select('id, business_name')
      .eq('id', dto.vendorAccountId)
      .eq('is_active', true)
      .single();

    if (!vendor) throw new NotFoundException('Vendor not found');

    const { data, error } = await supabase
      .from('vendor_bookings')
      .insert({
        vendor_account_id: dto.vendorAccountId,
        client_user_id: clientId,
        client_name: clientName,
        client_phone: clientPhone,
        booked_by_user_id: clientId,
        event_name: dto.eventName,
        event_date: dto.eventDate,
        start_time: dto.startTime ?? null,
        end_time: dto.endTime ?? null,
        venue_name: dto.venueName ?? null,
        venue_address: dto.venueAddress ?? null,
        notes: dto.notes ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Client ${clientId} booked vendor ${dto.vendorAccountId}`);
    return data;
  }

  /** Browse all active vendors (public directory, accessible within client portal) */
  async browseVendors(category?: string) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('vendor_accounts')
      .select(
        'id, business_name, category, city, state, bio, profile_image_url, hourly_rate, flat_rate, rate_description, is_verified, phone, email, website, instagram',
      )
      .eq('is_active', true)
      .order('business_name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error('browseVendors error', error);
      return [];
    }
    return data || [];
  }

  /** Contracts for this client */
  async getContracts(clientId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        event:event(id, name, date)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('getContracts error', error);
      return [];
    }
    return data || [];
  }

  /** Estimates for this client */
  async getEstimates(clientId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('estimates')
      .select(`
        *,
        event:event(id, name, date)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('getEstimates error', error);
      return [];
    }
    return data || [];
  }

  /** Messages between this client and their owner/vendors */
  async getMessages(clientId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`recipient_id.eq.${clientId},sender_id.eq.${clientId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      this.logger.error('getMessages error', error);
      return [];
    }
    return data || [];
  }

  /** Send a message from the client to the owner or a vendor */
  async sendMessage(
    clientId: string,
    clientPhone: string,
    recipientId: string,
    content: string,
    eventId?: string,
  ) {
    const supabase = this.supabaseService.getAdminClient();

    // Verify the recipient is actually an owner/vendor that this client is booked with
    const { data: bookings } = await supabase
      .from('booking')
      .select('event_id, event:event(owner_id)')
      .eq('user_id', clientId);

    const ownerIds = (bookings || []).map((b: any) => b.event?.owner_id).filter(Boolean);

    // Also collect vendor IDs for their events
    const eventIds = (bookings || []).map((b: any) => b.event_id).filter(Boolean);
    const { data: vendorBookings } = await supabase
      .from('vendor_bookings')
      .select('vendor_user_id')
      .in('event_id', eventIds)
      .eq('status', 'confirmed');

    const vendorUserIds = (vendorBookings || []).map((v: any) => v.vendor_user_id).filter(Boolean);

    const allowedRecipients = [...new Set([...ownerIds, ...vendorUserIds])];

    if (!allowedRecipients.includes(recipientId)) {
      throw new Error('You can only message the owner or vendors you are booked with.');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: clientId,
        recipient_id: recipientId,
        content,
        event_id: eventId || null,
        message_type: 'client_message',
        status: 'sent',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      this.logger.error('sendMessage error', error);
      throw new Error('Failed to send message.');
    }
    return data;
  }

  /** Notifications for this client */
  async getNotifications(clientId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      this.logger.error('getNotifications error', error);
      return [];
    }
    return data || [];
  }

  /** Mark a notification as read */
  async markNotificationRead(clientId: string, notificationId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', clientId);

    if (error) {
      this.logger.error('markNotificationRead error', error);
    }
    return { success: !error };
  }

  /** Items & packages the owner offers */
  async getItems(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Get owner ID from bookings (by user_id or contact_phone)
    const { data: bookings } = await supabase
      .from('booking')
      .select('event:event(owner_id)')
      .or(`user_id.eq.${clientId},contact_phone.eq.${clientPhone}`)
      .limit(1);

    const ownerId = (bookings?.[0] as any)?.event?.owner_id;
    if (!ownerId) return [];

    const { data, error } = await supabase
      .from('service_items')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      this.logger.error('getItems error', error);
      return [];
    }
    return data || [];
  }
}
