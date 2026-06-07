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
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import Stripe from 'stripe';
import {
  CreatePromoterEventDto,
  UpdatePromoterEventDto,
  CreateTicketTierDto,
  UpdateTicketTierDto,
} from './dto/promoter-event.dto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const zipcodes = require('zipcodes');

function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const APP_FEE_RATE   = 0.03;   // 3% platform fee → goes to our account
const STRIPE_PCT     = 0.029;  // Stripe's % fee
const STRIPE_FIXED   = 30;     // Stripe's fixed fee in cents ($0.30)

/**
 * Gross-up helper: calculates the total charge so that after Stripe's
 * processing fee AND the platform fee, the promoter nets the face value.
 *   totalCharge = ceil((ticketTotal + 0.30) / (1 - 0.029 - 0.03))
 */
function grossUp(ticketTotalCents: number): number {
  return Math.ceil((ticketTotalCents + STRIPE_FIXED) / (1 - STRIPE_PCT - APP_FEE_RATE));
}

@Injectable()
export class PromoterEventsService {
  private readonly logger = new Logger(PromoterEventsService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly smsNotifications: SmsNotificationsService,
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
        zip_code: dto.zip_code ?? null,
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
    if (dto.zip_code !== undefined) updates.zip_code = dto.zip_code;
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

  async listPublicEvents(zipCode?: string, category?: string, radiusMiles = 30) {
    const admin = this.supabaseService.getAdminClient();
    let query = admin
      .from('public_events')
      .select('*, ticket_tiers(id, name, price, quantity, quantity_sold), promoter_accounts(company_name, contact_name, profile_image_url)')
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    let events = data || [];

    if (zipCode) {
      const searchLoc = zipcodes.lookup(zipCode);
      if (searchLoc) {
        events = events.filter((event: any) => {
          if (!event.zip_code) return false;
          const eventLoc = zipcodes.lookup(event.zip_code);
          if (!eventLoc) return false;
          const dist = haversineDistanceMiles(
            searchLoc.latitude, searchLoc.longitude,
            eventLoc.latitude, eventLoc.longitude,
          );
          return dist <= radiusMiles;
        });
      } else {
        this.logger.warn(`Zip code lookup failed for: ${zipCode}`);
      }
    }

    return events;
  }

  async getPublicEvent(eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('public_events')
      .select('*, ticket_tiers(id, name, price, quantity, quantity_sold, description), promoter_accounts(company_name, contact_name, profile_image_url, location, instagram, website)')
      .eq('id', eventId)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Event not found');
    return data;
  }

  // ── STRIPE CHECKOUT for tickets ───────────────────────────────

  async createTicketCheckout(eventId: string, tierId: string, quantity: number, buyerPhone?: string, buyerEmail?: string, returnUrl?: string, buyerName?: string) {
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

    const unitAmount   = Math.round(Number(tier.price) * 100);
    const ticketTotal  = unitAmount * quantity;
    const totalCharge  = grossUp(ticketTotal);
    const serviceFee   = totalCharge - ticketTotal;
    const appFeeAmount = Math.round(totalCharge * APP_FEE_RATE);

    const successUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
      : `${this.frontendUrl}/events/${eventId}?paid=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}canceled=true`
      : `${this.frontendUrl}/events/${eventId}?canceled=true`;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...(buyerEmail ? { customer_email: buyerEmail } : {}),
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
            product_data: {
              name: 'Service fee',
              description: 'Covers payment processing and platform fee',
            },
            unit_amount: serviceFee,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: appFeeAmount,
        transfer_data: { destination: promoter.stripe_account_id },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        public_event_id: eventId,
        ticket_tier_id: tierId,
        quantity: String(quantity),
        ...(buyerEmail ? { buyer_email: buyerEmail } : {}),
        ...(buyerPhone ? { buyer_phone: buyerPhone } : {}),
        ...(buyerName ? { buyer_name: buyerName } : {}),
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

    const { public_event_id, ticket_tier_id, quantity, buyer_email, buyer_phone, buyer_name } = session.metadata || {};
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
      .select('quantity_sold, name')
      .eq('id', ticket_tier_id)
      .single();

    if (tier) {
      await admin
        .from('ticket_tiers')
        .update({ quantity_sold: (tier.quantity_sold ?? 0) + qty })
        .eq('id', ticket_tier_id);
    }

    // Send confirmation email with QR codes
    const toEmail = buyer_email ?? session.customer_email ?? '';
    if (toEmail) {
      try {
        const { data: event } = await admin
          .from('public_events')
          .select('title, event_date, start_time, venue_name, promoter_accounts(company_name)')
          .eq('id', public_event_id)
          .single();

        await this.mailService.sendTicketConfirmation({
          toEmail,
          eventTitle: event?.title ?? 'Your Event',
          eventDate: event?.event_date ?? '',
          eventTime: event?.start_time ?? null,
          venueName: event?.venue_name ?? null,
          tierName: tier?.name ?? 'General Admission',
          quantity: qty,
          amountTotal: session.amount_total ? session.amount_total / 100 : 0,
          eventId: public_event_id,
          promoterName: (event?.promoter_accounts as any)?.company_name ?? null,
          sessionId,
        });
      } catch (emailErr) {
        this.logger.warn(`Ticket confirmation email failed for session ${sessionId}: ${emailErr}`);
      }
    }

    this.logger.log(`Recorded ${qty} ticket(s) sold for event ${public_event_id}`);

    // ── Send email + SMS confirmation ───────────────────────────
    try {
      const { data: event } = await admin
        .from('public_events')
        .select('title, event_date, start_time, venue_name, promoter_accounts(company_name, contact_name)')
        .eq('id', public_event_id)
        .single();

      if (event) {
        const promoterName = (event.promoter_accounts as any)?.company_name
          || (event.promoter_accounts as any)?.contact_name
          || null;
        const toEmail = buyer_email ?? session.customer_email;
        const formattedDate = event.event_date
          ? new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })
          : 'TBD';

        if (toEmail) {
          await this.mailService.sendTicketConfirmation({
            toEmail,
            eventTitle: event.title,
            eventDate: event.event_date,
            eventTime: event.start_time ?? null,
            venueName: event.venue_name ?? null,
            tierName: tier?.name ?? 'General Admission',
            quantity: qty,
            amountTotal: session.amount_total ? session.amount_total / 100 : 0,
            eventId: public_event_id,
            promoterName,
            sessionId,
          });
        }

        if (buyer_phone) {
          await this.smsNotifications.ticketPurchaseConfirmed(
            buyer_phone,
            buyer_name ?? null,
            tier?.name ?? 'General Admission',
            qty,
            event.title,
            formattedDate,
            public_event_id,
            sessionId,
          );
        }
      }
    } catch (notifyErr) {
      this.logger.warn(`Ticket confirmation notifications failed for session ${sessionId}: ${notifyErr}`);
    }
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

  // ── TICKET LOOKUP ─────────────────────────────────────────────

  async getTicketsBySession(sessionId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('tickets')
      .select('*, ticket_tiers(name, price), public_events(title, event_date, venue_name, city, state)')
      .eq('stripe_checkout_session_id', sessionId);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getTicketById(ticketId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('tickets')
      .select('*, ticket_tiers(name, price), public_events(title, event_date, venue_name, city, state, promoter_accounts(company_name))')
      .eq('id', ticketId)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('Ticket not found');
    return data;
  }

  async forwardTicket(ticketId: string, recipientPhone?: string, recipientEmail?: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: ticket } = await admin
      .from('tickets')
      .select('id, status')
      .eq('id', ticketId)
      .maybeSingle();
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'used') throw new BadRequestException('Ticket has already been used');

    const forwardCode = crypto.randomUUID();
    const { error } = await admin
      .from('tickets')
      .update({
        forward_code: forwardCode,
        ...(recipientPhone ? { forward_recipient_phone: recipientPhone } : {}),
        ...(recipientEmail ? { forward_recipient_email: recipientEmail } : {}),
      })
      .eq('id', ticketId);
    if (error) throw new BadRequestException(error.message);
    return { forwardCode };
  }

  async getTicketByForwardCode(code: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('tickets')
      .select('*, ticket_tiers(name, price), public_events(title, event_date, venue_name, city, state)')
      .eq('forward_code', code)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('Invalid or expired forward code');
    return data;
  }

  // ── MULTI-TIER CHECKOUT ───────────────────────────────────────

  async createMultiTierCheckout(
    eventId: string,
    items: { tier_id: string; quantity: number }[],
    buyerPhone?: string,
    buyerEmail?: string,
    returnUrl?: string,
    buyerName?: string,
  ) {
    const admin = this.supabaseService.getAdminClient();

    const { data: event } = await admin
      .from('public_events')
      .select('*, promoter_accounts(stripe_account_id, stripe_connect_status, company_name)')
      .eq('id', eventId)
      .eq('status', 'published')
      .maybeSingle();
    if (!event) throw new NotFoundException('Event not found');

    const promoter = event.promoter_accounts;
    if (!promoter?.stripe_account_id || promoter.stripe_connect_status !== 'active') {
      throw new BadRequestException('Payments not enabled for this event');
    }

    // Validate all tiers and build line items
    let ticketTotal = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of items) {
      const { data: tier } = await admin
        .from('ticket_tiers')
        .select('*')
        .eq('id', item.tier_id)
        .eq('public_event_id', eventId)
        .maybeSingle();
      if (!tier) throw new NotFoundException(`Ticket tier ${item.tier_id} not found`);

      const available = tier.quantity - tier.quantity_sold;
      if (item.quantity > available) throw new BadRequestException(`Only ${available} tickets remaining for ${tier.name}`);

      const unitAmount = Math.round(Number(tier.price) * 100);
      ticketTotal += unitAmount * item.quantity;
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} — ${tier.name}`,
            description: event.venue_name ? `${event.event_date} at ${event.venue_name}` : event.event_date,
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      });
    }

    const totalCharge  = grossUp(ticketTotal);
    const serviceFee   = totalCharge - ticketTotal;
    const appFeeAmount = Math.round(totalCharge * APP_FEE_RATE);

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Service fee', description: 'Covers payment processing and platform fee' },
        unit_amount: serviceFee,
      },
      quantity: 1,
    });

    const successUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
      : `${this.frontendUrl}/events/${eventId}?paid=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}canceled=true`
      : `${this.frontendUrl}/events/${eventId}?canceled=true`;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...(buyerEmail ? { customer_email: buyerEmail } : {}),
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: appFeeAmount,
        transfer_data: { destination: promoter.stripe_account_id },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        public_event_id: eventId,
        items: JSON.stringify(items),
        ...(buyerEmail ? { buyer_email: buyerEmail } : {}),
        ...(buyerPhone ? { buyer_phone: buyerPhone } : {}),
        ...(buyerName ? { buyer_name: buyerName } : {}),
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  // ── DOOR SCAN ─────────────────────────────────────────────────

  async scanTicket(userId: string, eventId: string, ticketId: string) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    // Verify the event belongs to this promoter
    const { data: event } = await admin
      .from('public_events')
      .select('id')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Event not found');

    const { data: ticket } = await admin
      .from('tickets')
      .select('id, status, public_event_id')
      .eq('id', ticketId)
      .eq('public_event_id', eventId)
      .maybeSingle();
    if (!ticket) throw new NotFoundException('Ticket not found for this event');
    if (ticket.status === 'used') throw new BadRequestException('Ticket has already been scanned');

    const { error } = await admin
      .from('tickets')
      .update({ status: 'used', scanned_at: new Date().toISOString() })
      .eq('id', ticketId);
    if (error) throw new BadRequestException(error.message);

    return { success: true, message: 'Ticket scanned successfully' };
  }

  // ── COMP TICKETS ──────────────────────────────────────────────

  async sendCompTicket(
    userId: string,
    eventId: string,
    tierId: string,
    recipientEmail: string,
    recipientPhone?: string,
    recipientName?: string,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    const { data: event } = await admin
      .from('public_events')
      .select('id, title')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Event not found');

    const { data: tier } = await admin
      .from('ticket_tiers')
      .select('id, name')
      .eq('id', tierId)
      .eq('public_event_id', eventId)
      .maybeSingle();
    if (!tier) throw new NotFoundException('Ticket tier not found');

    const { data: newTicket, error } = await admin
      .from('tickets')
      .insert({
        public_event_id: eventId,
        ticket_tier_id: tierId,
        buyer_email: recipientEmail,
        ...(recipientPhone ? { buyer_phone: recipientPhone } : {}),
        ...(recipientName ? { buyer_name: recipientName } : {}),
        amount_paid: 0,
        status: 'valid',
        is_comp: true,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    return { success: true, ticket: newTicket };
  }

  async resendTicketConfirmation(userId: string, eventId: string, ticketId: string): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const promoter = await this.getPromoterAccount(userId);

    // Verify event belongs to this promoter
    const { data: event } = await admin
      .from('public_events')
      .select('id, title, event_date, venue_name, promoter_account_id')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!event) throw new ForbiddenException('Event not found');

    const { data: ticket } = await admin
      .from('tickets')
      .select('id, buyer_email, buyer_name, stripe_checkout_session_id, ticket_tiers(name, price), amount_paid')
      .eq('id', ticketId)
      .eq('public_event_id', eventId)
      .maybeSingle();
    if (!ticket) throw new NotFoundException('Ticket not found');

    const toEmail = ticket.buyer_email;
    if (!toEmail || !process.env.RESEND_API_KEY) {
      this.logger.warn(`[resendTicketConfirmation] No email or RESEND_API_KEY for ticket ${ticketId}`);
      return;
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const tierName = (ticket.ticket_tiers as any)?.name || 'General Admission';
      const eventUrl = `${this.frontendUrl}/events/${eventId}`;
      await resend.emails.send({
        from: `Eventecos Tickets <${process.env.RESEND_FROM || 'noreply@eventecos.com'}>`,
        to: toEmail,
        subject: `Your ticket to ${event.title} (resent)`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;"><h2>Your Ticket</h2><p>Here is your ticket for <strong>${event.title}</strong>.</p><table style="font-size:14px;"><tr><td style="color:#6b7280;padding:4px 12px 4px 0">Event</td><td><strong>${event.title}</strong></td></tr><tr><td style="color:#6b7280;padding:4px 12px 4px 0">Date</td><td>${event.event_date || 'TBD'}</td></tr><tr><td style="color:#6b7280;padding:4px 12px 4px 0">Venue</td><td>${event.venue_name || 'TBD'}</td></tr><tr><td style="color:#6b7280;padding:4px 12px 4px 0">Ticket</td><td>${tierName}</td></tr></table><br/><a href="${eventUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Event</a></div>`,
      });
      this.logger.log(`[resendTicketConfirmation] Resent confirmation to ${toEmail} for ticket ${ticketId}`);
    } catch (err) {
      this.logger.error(`[resendTicketConfirmation] Failed to resend for ticket ${ticketId}:`, err);
    }
  }
}
