import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import Stripe from 'stripe';
import {
  CreatePromoterEventDto,
  UpdatePromoterEventDto,
  CreateTicketTierDto,
  UpdateTicketTierDto,
} from './dto/promoter-event.dto';

const APP_FEE_RATE = 0.03;

@Injectable()
export class PromoterEventsService {
  private readonly logger = new Logger(PromoterEventsService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
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
        category: dto.category ?? null,
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
    if (dto.category !== undefined) updates.category = dto.category;
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

  async listPublicEvents(city?: string, category?: string) {
    const admin = this.supabaseService.getAdminClient();
    let query = admin
      .from('public_events')
      .select('*, ticket_tiers(id, name, price, quantity, quantity_sold), promoter_accounts(company_name, contact_name, profile_image_url)')
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    if (city) query = query.ilike('city', `%${city}%`);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getPublicEvent(eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('public_events')
      .select('*, ticket_tiers(id, name, price, quantity, quantity_sold, description), promoter_accounts(company_name, contact_name, profile_image_url, city, state)')
      .eq('id', eventId)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Event not found or not published');
    return data;
  }

  // ── STRIPE CHECKOUT for tickets ───────────────────────────────

  async createTicketCheckout(eventId: string, tierId: string, quantity: number, buyerEmail: string) {
    const admin = this.supabaseService.getAdminClient();

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

    const promoter = event.promoter_accounts;
    if (!promoter?.stripe_account_id || promoter.stripe_connect_status !== 'active') {
      throw new BadRequestException('Payments not enabled for this event');
    }

    const unitAmount = Math.round(Number(tier.price) * 100);
    const feeAmount = Math.round(unitAmount * quantity * APP_FEE_RATE);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: buyerEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} — ${tier.name}`,
            description: event.venue_name ? `${event.event_date} at ${event.venue_name}` : event.event_date,
          },
          unit_amount: unitAmount,
        },
        quantity,
      }],
      payment_intent_data: {
        application_fee_amount: feeAmount,
        transfer_data: { destination: promoter.stripe_account_id },
      },
      success_url: `${this.frontendUrl}/events/${eventId}?paid=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/events/${eventId}?canceled=true`,
      metadata: {
        public_event_id: eventId,
        ticket_tier_id: tierId,
        quantity: String(quantity),
        buyer_email: buyerEmail,
      },
    });

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

    const { public_event_id, ticket_tier_id, quantity, buyer_email } = session.metadata || {};
    if (!public_event_id || !ticket_tier_id) return;

    const qty = parseInt(quantity || '1', 10);

    // idempotency check — see if tickets already exist for this session
    const { data: existing } = await admin
      .from('tickets')
      .select('id')
      .eq('stripe_checkout_session_id', sessionId)
      .limit(1);

    if (existing && existing.length > 0) return;

    // create ticket records (one per ticket)
    const ticketRows = Array.from({ length: qty }, () => ({
      public_event_id,
      ticket_tier_id,
      buyer_email: buyer_email ?? session.customer_email,
      stripe_checkout_session_id: sessionId,
      amount_paid: session.amount_total ? session.amount_total / 100 / qty : 0,
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
  }

  // ── ATTENDEE LIST ─────────────────────────────────────────────

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
}
