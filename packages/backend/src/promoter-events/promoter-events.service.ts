import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { TwilioService } from '../messaging/twilio.service';
import Stripe from 'stripe';
import {
  CreatePromoterEventDto,
  UpdatePromoterEventDto,
  CreateTicketTierDto,
  UpdateTicketTierDto,
} from './dto/promoter-event.dto';

const PLATFORM_FEE_RATE = 0.03;          // 3% platform service fee
const STRIPE_FEE_RATE   = 0.029;         // 2.9% Stripe payment processing
const STRIPE_FEE_FIXED  = 30;            // $0.30 fixed Stripe fee (cents)

@Injectable()
export class PromoterEventsService {
  private readonly logger = new Logger(PromoterEventsService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly twilioService: TwilioService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-04-10' as any,
    });
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  // ── helpers ──────────────────────────────────────────────────

  private async getPromoterAccount(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_accounts')
      .select('id, stripe_account_id, stripe_connect_status, company_name, contact_name, email')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('Promoter account not found');
    return data;
  }

  // ── EVENTS CRUD ───────────────────────────────────────────────

  async createEvent(userId: string, dto: CreatePromoterEventDto) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    // Block publishing paid events without active Stripe Connect
    const hasPaidTiers = dto.ticket_tiers?.some(t => Number(t.price) > 0) ?? false;
    if (hasPaidTiers && (!promoter.stripe_account_id || promoter.stripe_connect_status !== 'active')) {
      throw new BadRequestException(
        'You must connect a Stripe account before selling paid tickets. Go to Profile Settings to set up payments.'
      );
    }

    const { data: event, error } = await admin
      .from('public_events')
      .insert({
        promoter_account_id: promoter.id,
        title: dto.title,
        description: dto.description ?? null,
        event_date: dto.event_date,
        start_time: dto.start_time ?? null,
        end_time: dto.end_time ?? null,
        venue_name: dto.venue_name ?? null,
        venue_address: dto.venue_address ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        zip_code: dto.zip_code ?? null,
        category: dto.category ?? null,
        ...(dto.venue_type !== undefined && { venue_type: dto.venue_type }),
        image_url: dto.image_url ?? null,
        age_restriction: dto.age_restriction ?? null,
        status: dto.status ?? 'draft',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // create ticket tiers if provided
    if (dto.ticket_tiers && dto.ticket_tiers.length > 0) {
      await this.createTicketTiers(event.id, dto.ticket_tiers);
    }

    return this.getEvent(userId, event.id);
  }

  async listEvents(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    const { data, error } = await admin
      .from('public_events')
      .select('*, ticket_tiers(id, name, price, quantity, quantity_sold)')
      .eq('promoter_account_id', promoter.id)
      .order('event_date', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getEvent(userId: string, eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    const { data, error } = await admin
      .from('public_events')
      .select('*, ticket_tiers(*)')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Event not found');
    return data;
  }

  async updateEvent(userId: string, eventId: string, dto: UpdatePromoterEventDto) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    const { data: existing } = await admin
      .from('public_events')
      .select('id')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!existing) throw new ForbiddenException('Event not found');

    // Block publishing if the event has paid tiers and no active Stripe Connect
    if (dto.status === 'published') {
      const { data: tiers } = await admin
        .from('ticket_tiers')
        .select('price')
        .eq('public_event_id', eventId);
      const eventHasPaidTiers = tiers?.some(t => Number(t.price) > 0) ?? false;
      if (eventHasPaidTiers && (!promoter.stripe_account_id || promoter.stripe_connect_status !== 'active')) {
        throw new BadRequestException(
          'You must connect a Stripe account before publishing an event with paid tickets. Go to Profile Settings to set up payments.'
        );
      }
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.event_date !== undefined) updates.event_date = dto.event_date;
    if (dto.start_time !== undefined) updates.start_time = dto.start_time;
    if (dto.end_time !== undefined) updates.end_time = dto.end_time;
    if (dto.venue_name !== undefined) updates.venue_name = dto.venue_name;
    if (dto.venue_address !== undefined) updates.venue_address = dto.venue_address;
    if (dto.city !== undefined) updates.city = dto.city;
    if (dto.state !== undefined) updates.state = dto.state;
    if (dto.zip_code !== undefined) updates.zip_code = dto.zip_code;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.venue_type !== undefined) updates.venue_type = dto.venue_type;
    if (dto.image_url !== undefined) updates.image_url = dto.image_url;
    if (dto.age_restriction !== undefined) updates.age_restriction = dto.age_restriction;
    if (dto.status !== undefined) updates.status = dto.status;

    const { data, error } = await admin
      .from('public_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteEvent(userId: string, eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    const { error } = await admin
      .from('public_events')
      .delete()
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ── TICKET TIERS ──────────────────────────────────────────────

  async createTicketTiers(eventId: string, tiers: CreateTicketTierDto[]) {
    const admin = this.supabaseService.getAdminClient();
    const rows = tiers.map(t => ({
      public_event_id: eventId,
      name: t.name,
      price: t.price,
      quantity: t.quantity,
      quantity_sold: 0,
      description: t.description ?? null,
    }));
    const { data, error } = await admin.from('ticket_tiers').insert(rows).select();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async addTicketTier(userId: string, eventId: string, dto: CreateTicketTierDto) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    const { data: event } = await admin
      .from('public_events')
      .select('id')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Event not found');

    const { data, error } = await admin.from('ticket_tiers').insert({
      public_event_id: eventId,
      name: dto.name,
      price: dto.price,
      quantity: dto.quantity,
      quantity_sold: 0,
      description: dto.description ?? null,
    }).select().single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateTicketTier(userId: string, tierId: string, dto: UpdateTicketTierDto) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    // verify ownership via event
    const { data: tier } = await admin
      .from('ticket_tiers')
      .select('id, public_event_id')
      .eq('id', tierId)
      .maybeSingle();
    if (!tier) throw new NotFoundException('Ticket tier not found');

    const { data: event } = await admin
      .from('public_events')
      .select('id')
      .eq('id', tier.public_event_id)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Access denied');

    const updates: any = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.price !== undefined) updates.price = dto.price;
    if (dto.quantity !== undefined) updates.quantity = dto.quantity;
    if (dto.description !== undefined) updates.description = dto.description;

    const { data, error } = await admin
      .from('ticket_tiers')
      .update(updates)
      .eq('id', tierId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteTicketTier(userId: string, tierId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    const { data: tier } = await admin
      .from('ticket_tiers')
      .select('id, public_event_id')
      .eq('id', tierId)
      .maybeSingle();
    if (!tier) throw new NotFoundException('Ticket tier not found');

    const { data: event } = await admin
      .from('public_events')
      .select('id')
      .eq('id', tier.public_event_id)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Access denied');

    const { error } = await admin.from('ticket_tiers').delete().eq('id', tierId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ── PUBLIC ROUTES (no auth) ───────────────────────────────────

  async listPublicEvents(zipCode?: string, category?: string, radiusMiles?: number) {
    const client = this.supabaseService.getClient();
    let query = client
      .from('public_events')
      .select('*, ticket_tiers(id, name, price, quantity, quantity_sold), promoter_accounts(company_name, contact_name, profile_image_url)')
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    if (category) query = query.eq('category', category);

    // If zip + radius provided, geocode and filter by distance
    if (zipCode && radiusMiles) {
      const [origin, fetchResult] = await Promise.all([
        this.geocodeZip(zipCode),
        query,
      ]);

      if (fetchResult.error) throw new BadRequestException(fetchResult.error.message);
      const events: any[] = fetchResult.data || [];

      if (!origin) return events; // can't geocode origin, return all

      // Geocode all unique event zip codes in parallel
      const uniqueZips = [...new Set(events.map((e: any) => e.zip_code).filter(Boolean))] as string[];
      const zipCoords = new Map<string, { lat: number; lng: number } | null>();
      await Promise.all(uniqueZips.map(async z => {
        zipCoords.set(z, await this.geocodeZip(z));
      }));

      return events.filter((ev: any) => {
        if (!ev.zip_code) return true;
        const coords = zipCoords.get(ev.zip_code);
        if (!coords) return true;
        return this.haversineDistance(origin.lat, origin.lng, coords.lat, coords.lng) <= radiusMiles;
      });
    }

    if (zipCode && !radiusMiles) query = query.eq('zip_code', zipCode);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  private async geocodeZip(zipCode: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zipCode)}&country=US&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'EventEcos/1.0' } });
      const data: any[] = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* ignore */ }
    return null;
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3958.8; // miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async getPublicEvent(eventId: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('public_events')
      .select('*, ticket_tiers(id, name, price, quantity, quantity_sold, description), promoter_accounts(company_name, contact_name, profile_image_url, location)')
      .eq('id', eventId)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Event not found or not published');
    return data;
  }

  // ── STRIPE CHECKOUT for tickets ───────────────────────────────

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return '+1' + digits;
    if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
    return raw.startsWith('+') ? raw : '+' + digits;
  }

  async createTicketCheckout(eventId: string, tierId: string, quantity: number, buyerPhone: string, buyerEmail?: string, returnUrl?: string) {
    const baseUrl = returnUrl || this.frontendUrl;
    const admin = this.supabaseService.getAdminClient();
    buyerPhone = this.normalizePhone(buyerPhone);

    const { data: event } = await admin
      .from('public_events')
      .select('*, promoter_accounts(stripe_account_id, stripe_connect_status, company_name, contact_name)')
      .eq('id', eventId)
      .eq('status', 'published')
      .maybeSingle();

    if (!event) throw new NotFoundException('Event not found');

    const { data: tier } = await admin
      .from('ticket_tiers')
      .select('*')
      .eq('id', tierId)
      .eq('public_event_id', eventId)
      .maybeSingle();

    if (!tier) throw new NotFoundException('Ticket tier not found');

    const available = tier.quantity - tier.quantity_sold;
    if (quantity > available) throw new BadRequestException(`Only ${available} tickets remaining`);

    const unitPrice = Number(tier.price);

    // ── FREE TICKETS: skip Stripe entirely ──────────────────────
    if (unitPrice === 0) {
      if (!buyerPhone) throw new BadRequestException('Phone number is required');
      const ticketRows = Array.from({ length: quantity }, () => ({
        public_event_id: eventId,
        ticket_tier_id: tierId,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone,
        stripe_checkout_session_id: null,
        amount_paid: 0,
        status: 'valid',
      }));
      await admin.from('tickets').insert(ticketRows);
      const { data: tierRow } = await admin
        .from('ticket_tiers')
        .select('quantity_sold')
        .eq('id', tierId)
        .single();
      if (tierRow) {
        await admin
          .from('ticket_tiers')
          .update({ quantity_sold: (tierRow.quantity_sold ?? 0) + quantity })
          .eq('id', tierId);
      }
      // Send confirmation for free tickets too (no webhook fires)
      await this.sendTicketNotifications({
        eventId,
        tierId,
        quantity,
        amountTotal: 0,
        buyerPhone,
        buyerEmail,
      });
      return { url: `${baseUrl}/events/${eventId}?paid=true`, sessionId: null };
    }

    // ── PAID TICKETS: require active Stripe Connect (prod only) ──
    const promoter = event.promoter_accounts;
    const isTestMode = (this.configService.get<string>('STRIPE_SECRET_KEY') || '').startsWith('sk_test_');
    const hasActiveConnect = promoter?.stripe_account_id && promoter.stripe_connect_status === 'active';

    if (!hasActiveConnect && !isTestMode) {
      throw new BadRequestException('Payments not enabled for this event');
    }

    const unitAmount = Math.round(unitPrice * 100);
    const subtotalCents = unitAmount * quantity;
    const platformFeeCents = Math.round(subtotalCents * PLATFORM_FEE_RATE);
    const stripeFeeCents   = Math.round(subtotalCents * STRIPE_FEE_RATE) + STRIPE_FEE_FIXED;

    if (!buyerPhone) throw new BadRequestException('Phone number is required');
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      ...(buyerEmail ? { customer_email: buyerEmail } : {}),
      phone_number_collection: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.title} — ${tier.name}`,
              description: event.venue_name ? `${event.event_date} at ${event.venue_name}` : event.event_date,
            },
            unit_amount: unitAmount,
          },
          quantity,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Platform Service Fee (3%)' },
            unit_amount: platformFeeCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Payment Processing Fee' },
            unit_amount: stripeFeeCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/tickets/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/events/${eventId}?canceled=true`,
      metadata: {
        public_event_id: eventId,
        ticket_tier_id: tierId,
        quantity: String(quantity),
        buyer_email: buyerEmail || '',
        buyer_phone: buyerPhone,
      },
    };

    // application_fee = platform fee only; Stripe takes their cut separately
    if (hasActiveConnect) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: promoter.stripe_account_id },
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    return { url: session.url, sessionId: session.id };
  }

  // ── MULTI-TIER CHECKOUT ────────────────────────────────────────

  async createMultiTierCheckout(
    eventId: string,
    items: { tier_id: string; quantity: number }[],
    buyerPhone: string,
    buyerEmail?: string,
    returnUrl?: string,
  ) {
    const baseUrl = returnUrl || this.frontendUrl;
    const admin = this.supabaseService.getAdminClient();
    buyerPhone = this.normalizePhone(buyerPhone);
    if (!buyerPhone) throw new BadRequestException('Phone number is required');

    const { data: event } = await admin
      .from('public_events')
      .select('*, promoter_accounts(stripe_account_id, stripe_connect_status, company_name, contact_name)')
      .eq('id', eventId)
      .eq('status', 'published')
      .maybeSingle();
    if (!event) throw new NotFoundException('Event not found');

    // Validate each tier and check availability
    const tierResults: { tier: any; quantity: number }[] = [];
    for (const item of items) {
      const { data: tier } = await admin
        .from('ticket_tiers')
        .select('*')
        .eq('id', item.tier_id)
        .eq('public_event_id', eventId)
        .maybeSingle();
      if (!tier) throw new NotFoundException(`Ticket tier not found`);
      const available = tier.quantity - tier.quantity_sold;
      if (item.quantity > available)
        throw new BadRequestException(`Only ${available} tickets remaining for "${tier.name}"`);
      tierResults.push({ tier, quantity: item.quantity });
    }

    const allFree = tierResults.every(r => Number(r.tier.price) === 0);

    if (allFree) {
      for (const { tier, quantity } of tierResults) {
        const ticketRows = Array.from({ length: quantity }, () => ({
          public_event_id: eventId,
          ticket_tier_id: tier.id,
          buyer_email: buyerEmail || null,
          buyer_phone: buyerPhone,
          stripe_checkout_session_id: null,
          amount_paid: 0,
          status: 'valid',
        }));
        await admin.from('tickets').insert(ticketRows);
        const { data: tierRow } = await admin.from('ticket_tiers').select('quantity_sold').eq('id', tier.id).single();
        if (tierRow) {
          await admin.from('ticket_tiers').update({ quantity_sold: (tierRow.quantity_sold ?? 0) + quantity }).eq('id', tier.id);
        }
        await this.sendTicketNotifications({ eventId, tierId: tier.id, quantity, amountTotal: 0, buyerPhone, buyerEmail });
      }
      return { url: `${baseUrl}/events/${eventId}?paid=true`, sessionId: null };
    }

    // Paid: build Stripe checkout with multiple line items
    const promoter = event.promoter_accounts;
    const isTestMode = (this.configService.get<string>('STRIPE_SECRET_KEY') || '').startsWith('sk_test_');
    const hasActiveConnect = promoter?.stripe_account_id && promoter.stripe_connect_status === 'active';
    if (!hasActiveConnect && !isTestMode) throw new BadRequestException('Payments not enabled for this event');

    const ticketLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = tierResults.map(({ tier, quantity }) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${event.title} — ${tier.name}`,
          description: event.venue_name ? `${event.event_date} at ${event.venue_name}` : event.event_date,
        },
        unit_amount: Math.round(Number(tier.price) * 100),
      },
      quantity,
    }));

    const subtotalCents    = tierResults.reduce((s, { tier, quantity }) => s + Math.round(Number(tier.price) * 100) * quantity, 0);
    const platformFeeCents  = Math.round(subtotalCents * PLATFORM_FEE_RATE);
    const stripeFeeCents    = Math.round(subtotalCents * STRIPE_FEE_RATE) + STRIPE_FEE_FIXED;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      ...ticketLineItems,
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Platform Service Fee (3%)' },
          unit_amount: platformFeeCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Payment Processing Fee' },
          unit_amount: stripeFeeCents,
        },
        quantity: 1,
      },
    ];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      ...(buyerEmail ? { customer_email: buyerEmail } : {}),
      phone_number_collection: { enabled: true },
      line_items: lineItems,
      success_url: `${baseUrl}/tickets/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/events/${eventId}?canceled=true`,
      metadata: {
        public_event_id: eventId,
        items_json: JSON.stringify(items),
        buyer_email: buyerEmail || '',
        buyer_phone: buyerPhone,
      },
    };

    if (hasActiveConnect) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: promoter.stripe_account_id },
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    return { url: session.url, sessionId: session.id };
  }

  // ── WEBHOOK: mark tickets sold ────────────────────────────────

  async markTicketsSoldBySession(sessionId: string) {
    const admin = this.supabaseService.getAdminClient();

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
    } catch {
      return;
    }

    const { public_event_id, ticket_tier_id, quantity, buyer_email, buyer_phone, items_json } = session.metadata || {};
    if (!public_event_id) return;

    const phone = (buyer_phone || (session.customer_details?.phone ?? '')).trim() || null;
    const email = buyer_email ?? session.customer_email ?? session.customer_details?.email ?? null;

    // idempotency check
    const { data: existing } = await admin
      .from('tickets')
      .select('id')
      .eq('stripe_checkout_session_id', sessionId)
      .limit(1);
    if (existing && existing.length > 0) return;

    const amountTotal = session.amount_total ? session.amount_total / 100 : 0;

    if (items_json) {
      // ── Multi-tier checkout ──────────────────────────────────
      const items: { tier_id: string; quantity: number }[] = JSON.parse(items_json);
      const totalTickets = items.reduce((s, i) => s + i.quantity, 0);

      for (const item of items) {
        const ticketRows = Array.from({ length: item.quantity }, () => ({
          public_event_id,
          ticket_tier_id: item.tier_id,
          buyer_email: email,
          buyer_phone: phone,
          stripe_checkout_session_id: sessionId,
          amount_paid: totalTickets > 0 ? amountTotal / totalTickets : 0,
          status: 'valid',
        }));
        await admin.from('tickets').insert(ticketRows);

        const { data: tier } = await admin.from('ticket_tiers').select('quantity_sold').eq('id', item.tier_id).single();
        if (tier) {
          await admin.from('ticket_tiers').update({ quantity_sold: (tier.quantity_sold ?? 0) + item.quantity }).eq('id', item.tier_id);
        }

        if (phone || email) {
          await this.sendTicketNotifications({
            eventId: public_event_id,
            tierId: item.tier_id,
            quantity: item.quantity,
            amountTotal: totalTickets > 0 ? amountTotal * (item.quantity / totalTickets) : 0,
            buyerPhone: phone || undefined,
            buyerEmail: email || undefined,
            sessionId,
          });
        }
      }
      this.logger.log(`Recorded ${totalTickets} ticket(s) (multi-tier) sold for event ${public_event_id}`);
      return;
    }

    // ── Single-tier checkout (legacy) ────────────────────────
    if (!ticket_tier_id) return;

    const qty = parseInt(quantity || '1', 10);

    // create ticket records (one per ticket)
    const ticketRows = Array.from({ length: qty }, () => ({
      public_event_id,
      ticket_tier_id,
      buyer_email: email,
      buyer_phone: phone,
      stripe_checkout_session_id: sessionId,
      amount_paid: qty > 0 ? amountTotal / qty : 0,
      status: 'valid',
    }));

    await admin.from('tickets').insert(ticketRows);

    // increment quantity_sold on tier
    const { data: tier } = await admin
      .from('ticket_tiers')
      .select('quantity_sold')
      .eq('id', ticket_tier_id)
      .single();

    if (tier) {
      await admin
        .from('ticket_tiers')
        .update({ quantity_sold: (tier.quantity_sold ?? 0) + qty })
        .eq('id', ticket_tier_id);
    }

    this.logger.log(`Recorded ${qty} ticket(s) sold for event ${public_event_id}`);

    // Fire-and-forget customer notifications
    if (phone || email) {
      await this.sendTicketNotifications({
        eventId: public_event_id,
        tierId: ticket_tier_id,
        quantity: qty,
        amountTotal,
        buyerPhone: phone || undefined,
        buyerEmail: email || undefined,
        sessionId,
      });
    }
  }

  /**
   * Sends SMS (always if phone) and email (if provided) confirmation
   * after a ticket purchase. Never throws — notification failures must
   * not break the webhook or the free-ticket flow.
   */
  private async sendTicketNotifications(params: {
    eventId: string;
    tierId: string;
    quantity: number;
    amountTotal: number;
    buyerPhone?: string;
    buyerEmail?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      const admin = this.supabaseService.getAdminClient();
      const { data: event } = await admin
        .from('public_events')
        .select('title, event_date, start_time, venue_name, promoter_accounts(company_name, contact_name)')
        .eq('id', params.eventId)
        .maybeSingle();

      const { data: tier } = await admin
        .from('ticket_tiers')
        .select('name')
        .eq('id', params.tierId)
        .maybeSingle();

      if (!event || !tier) {
        this.logger.warn(`sendTicketNotifications: missing event/tier for ${params.eventId}/${params.tierId}`);
        return;
      }

      const promoter: any = Array.isArray((event as any).promoter_accounts)
        ? (event as any).promoter_accounts[0]
        : (event as any).promoter_accounts;
      const promoterName = promoter?.company_name || promoter?.contact_name || null;

      // Email — only if provided
      if (params.buyerEmail) await this.mailService.sendTicketConfirmation({
        toEmail: params.buyerEmail,
        eventTitle: (event as any).title,
        eventDate: (event as any).event_date,
        eventTime: (event as any).start_time,
        venueName: (event as any).venue_name,
        tierName: (tier as any).name,
        quantity: params.quantity,
        amountTotal: params.amountTotal,
        eventId: params.eventId,
        promoterName,
        sessionId: params.sessionId,
      });

      // SMS — only if phone provided
      if (params.buyerPhone) {
        try {
          const eventUrl = params.sessionId
            ? `${this.frontendUrl}/tickets/${params.sessionId}`
            : `${this.frontendUrl}/events/${params.eventId}?paid=true`;
          const dateStr = (event as any).event_date
            ? new Date((event as any).event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '';
          const msg = `Your ${params.quantity} ticket(s) to ${(event as any).title}${dateStr ? ` on ${dateStr}` : ''} are confirmed! View event details: ${eventUrl}`;
          await this.twilioService.sendSMS(params.buyerPhone, msg);
        } catch (smsErr) {
          this.logger.error(`Ticket SMS failed for ${params.buyerPhone}`, smsErr as any);
        }
      }
    } catch (err) {
      this.logger.error('sendTicketNotifications failed', err as any);
    }
  }

  // ── ATTENDEE LIST ─────────────────────────────────────────────

  async getTicketsBySession(sessionId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: tickets, error } = await admin
      .from('tickets')
      .select('*, ticket_tiers(name, price), public_events(id, title, event_date, start_time, venue_name, venue_address, city, state, image_url)')
      .eq('stripe_checkout_session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    if (!tickets || tickets.length === 0) throw new NotFoundException('No tickets found for this session');
    return tickets;
  }

  async getTicketById(ticketId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: ticket, error } = await admin
      .from('tickets')
      .select('*, ticket_tiers(name, price), public_events(id, title, event_date, start_time, venue_name, venue_address, city, state, image_url)')
      .eq('id', ticketId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async scanTicket(userId: string, eventId: string, ticketId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    // Verify promoter owns this event
    const { data: event } = await admin
      .from('public_events')
      .select('id, title')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Event not found or not yours');

    // Find the ticket
    const { data: ticket } = await admin
      .from('tickets')
      .select('*, ticket_tiers(name)')
      .eq('id', ticketId)
      .eq('public_event_id', eventId)
      .maybeSingle();

    if (!ticket) return { valid: false, reason: 'Ticket not found', ticket: null };
    if (ticket.status === 'used')  return { valid: false, reason: 'Already scanned', ticket };
    if (ticket.status === 'invalid') return { valid: false, reason: 'Invalid ticket', ticket };

    // Mark as used
    await admin.from('tickets').update({ status: 'used' }).eq('id', ticketId);

    return { valid: true, reason: 'Check-in successful', ticket: { ...ticket, status: 'used' } };
  }

  async getEventAttendees(userId: string, eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    const { data: event } = await admin
      .from('public_events')
      .select('id')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Event not found');

    const { data, error } = await admin
      .from('tickets')
      .select('*, ticket_tiers(name, price)')
      .eq('public_event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ── Ticket Forwarding ─────────────────────────────────────────

  /** Generates a forward code for a ticket and notifies the recipient via SMS/email */
  async forwardTicket(
    ticketId: string,
    recipientPhone?: string,
    recipientEmail?: string,
  ): Promise<{ code: string }> {
    if (!recipientPhone && !recipientEmail) {
      throw new BadRequestException('Provide a recipient phone or email');
    }

    const admin = this.supabaseService.getAdminClient();

    // Verify ticket exists
    const { data: ticket } = await admin
      .from('tickets')
      .select('id, status, public_events(id, title, event_date, venue_name)')
      .eq('id', ticketId)
      .maybeSingle();
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'used') throw new BadRequestException('This ticket has already been scanned');

    // Generate a unique 7-char alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/1/0 to avoid confusion
    let code = '';
    let attempts = 0;
    while (attempts < 10) {
      code = Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const { data: existing } = await admin
        .from('ticket_forward_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      if (!existing) break;
      attempts++;
    }

    // Upsert: one active forward per ticket (replace previous code)
    await admin.from('ticket_forward_codes').delete().eq('ticket_id', ticketId).is('claimed_at', null);
    const { error: insertErr } = await admin.from('ticket_forward_codes').insert({
      ticket_id: ticketId,
      code,
      recipient_phone: recipientPhone || null,
      recipient_email: recipientEmail || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (insertErr) throw new BadRequestException(insertErr.message);

    const event: any = ticket.public_events;
    const eventTitle = event?.title || 'the event';
    const claimUrl = `${this.frontendUrl}/tickets/claim?code=${code}`;

    // Send SMS
    if (recipientPhone) {
      try {
        const phone = this.normalizePhone(recipientPhone);
        await this.twilioService.sendSMS(
          phone,
          `You've been sent a ticket to ${eventTitle}! Use code ${code} to access it at: ${claimUrl}`,
        );
      } catch (e) {
        this.logger.warn('Forward SMS failed', e);
      }
    }

    // Send email
    if (recipientEmail) {
      try {
        await this.mailService.sendTicketForwardEmail({
          toEmail: recipientEmail,
          eventTitle,
          code,
          claimUrl,
        });
      } catch (e) {
        this.logger.warn('Forward email failed', e);
      }
    }

    return { code };
  }

  /** Looks up a ticket by its forward code for the claim page */
  async getTicketByForwardCode(code: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: forward, error } = await admin
      .from('ticket_forward_codes')
      .select('*, tickets(*, ticket_tiers(name, price), public_events(id, title, event_date, start_time, venue_name, venue_address, city, state, image_url))')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!forward) throw new NotFoundException('Invalid or expired code');

    const expiresAt = new Date(forward.expires_at);
    if (expiresAt < new Date()) throw new BadRequestException('This code has expired');

    return forward.tickets;
  }

  // ── Comp Tickets ──────────────────────────────────────────────

  /**
   * Issues a complimentary (free) ticket for an event and notifies the recipient.
   * Only the promoter who owns the event can issue comp tickets.
   */
  async sendCompTicket(
    userId: string,
    eventId: string,
    tierId: string,
    recipientEmail: string,
    recipientPhone?: string,
    recipientName?: string,
  ): Promise<{ ticket: any }> {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    // Verify promoter owns this event
    const { data: event } = await admin
      .from('public_events')
      .select('id, title, event_date, start_time, venue_name, promoter_account_id')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Event not found or not yours');

    // Verify tier belongs to this event
    const { data: tier } = await admin
      .from('ticket_tiers')
      .select('id, name, quantity, quantity_sold')
      .eq('id', tierId)
      .eq('public_event_id', eventId)
      .maybeSingle();
    if (!tier) throw new NotFoundException('Ticket tier not found');

    // Create a comp ticket (amount_paid = 0, status = valid, is_comp = true)
    const { data: ticket, error: ticketErr } = await admin
      .from('tickets')
      .insert({
        public_event_id: eventId,
        ticket_tier_id: tierId,
        buyer_email: recipientEmail,
        buyer_phone: recipientPhone ? this.normalizePhone(recipientPhone) : null,
        amount_paid: 0,
        status: 'valid',
        is_comp: true,
        comp_note: recipientName ? `Comp issued to ${recipientName}` : 'Complimentary ticket',
      })
      .select()
      .single();
    if (ticketErr) throw new BadRequestException(ticketErr.message);

    // Increment quantity_sold
    await admin
      .from('ticket_tiers')
      .update({ quantity_sold: (tier.quantity_sold || 0) + 1 })
      .eq('id', tierId);

    const promoterName = promoter.company_name || promoter.contact_name || 'The Promoter';
    const ticketUrl = `${this.frontendUrl}/ticket/${ticket.id}`;

    // Send email
    try {
      await this.mailService.sendCompTicketEmail({
        toEmail: recipientEmail,
        toName: recipientName || recipientEmail,
        eventTitle: (event as any).title,
        eventDate: (event as any).event_date,
        eventTime: (event as any).start_time || null,
        venueName: (event as any).venue_name,
        tierName: tier.name,
        ticketUrl,
        ticketId: ticket.id,
        promoterName,
        eventId,
      });
    } catch (e) {
      this.logger.warn('Comp ticket email failed', e);
    }

    // Send SMS
    if (recipientPhone) {
      try {
        const phone = this.normalizePhone(recipientPhone);
        const dateStr = (event as any).event_date
          ? new Date((event as any).event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '';
        await this.twilioService.sendSMS(
          phone,
          `${promoterName} sent you a complimentary ticket to ${(event as any).title}${dateStr ? ` on ${dateStr}` : ''}! View it here: ${ticketUrl}`,
        );
      } catch (e) {
        this.logger.warn('Comp ticket SMS failed', e);
      }
    }

    return { ticket };
  }
}
