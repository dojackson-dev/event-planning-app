import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { MailService } from '../mail/mail.service';
import { grossUp } from '../promoter-events/promoter-events.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NONPROFIT_APP_FEE_RATE } from './nonprofit-gate';

export class SponsorshipCheckoutDto {
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  companyName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PENDING_PER_EMAIL_PER_HOUR = 5;

interface OrderRow {
  id: string;
  sponsorship_level_id: string | null;
  buyer_name: string;
  buyer_email: string;
  company_name: string | null;
  event_title: string;
  event_date: string | null;
  public_event_id: string | null;
  level_name: string;
  org_name: string | null;
  org_ein: string | null;
  tables_included: number;
  seats_per_table: number;
  tickets_included: number;
  price: number;
  fair_market_value: number;
  deductible_amount: number;
  service_fee: number;
  total_charged: number;
}

function clean(value: string | undefined, max: number): string | null {
  const v = (value ?? '').trim();
  return v ? v.slice(0, max) : null;
}

@Injectable()
export class SponsorshipCheckoutService {
  private readonly logger = new Logger(SponsorshipCheckoutService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.stripe = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2024-04-10' as any,
      },
    );
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /** Public: starts a Stripe Checkout for one sponsorship level. */
  async createCheckout(levelId: string, dto: SponsorshipCheckoutDto) {
    const buyerName = clean(dto?.buyerName, 120);
    const buyerEmail = clean(dto?.buyerEmail, 254)?.toLowerCase() ?? null;
    if (!buyerName) throw new BadRequestException('Your name is required.');
    if (!buyerEmail || !EMAIL_RE.test(buyerEmail)) {
      throw new BadRequestException('A valid email is required.');
    }

    const admin = this.supabase.getAdminClient();

    const { data: level } = await admin
      .from('sponsorship_levels')
      .select(
        'id, public_event_id, name, price, fair_market_value, quantity_available, quantity_sold, tables_included, seats_per_table, tickets_included, is_active',
      )
      .eq('id', levelId)
      .eq('is_active', true)
      .maybeSingle();
    if (!level) throw new NotFoundException('Sponsorship level not found');

    const { data: event } = await admin
      .from('public_events')
      .select('id, title, event_date, promoter_account_id')
      .eq('id', level.public_event_id)
      .eq('status', 'published')
      .maybeSingle();
    if (!event) throw new NotFoundException('Event not found');

    const { data: promoter } = await admin
      .from('promoter_accounts')
      .select(
        'id, company_name, contact_name, is_nonprofit, nonprofit_status, nonprofit_legal_name, nonprofit_ein, stripe_account_id, stripe_connect_status',
      )
      .eq('id', event.promoter_account_id)
      .maybeSingle();
    if (
      !promoter?.is_nonprofit ||
      promoter.nonprofit_status !== 'verified' ||
      !promoter.stripe_account_id ||
      promoter.stripe_connect_status !== 'active'
    ) {
      throw new BadRequestException('Payments not enabled for this event');
    }

    if (
      level.quantity_available !== null &&
      level.quantity_sold >= level.quantity_available
    ) {
      throw new BadRequestException('This sponsorship level is sold out.');
    }

    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recent } = await admin
      .from('sponsorship_orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_email', buyerEmail)
      .eq('status', 'pending')
      .gte('created_at', hourAgo);
    if ((recent ?? 0) >= MAX_PENDING_PER_EMAIL_PER_HOUR) {
      throw new HttpException(
        'Too many checkout attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const priceCents = Math.round(Number(level.price) * 100);
    if (priceCents < 50) {
      throw new BadRequestException('This level cannot be purchased online.');
    }
    // Buyer pays processing + the reduced non-profit platform fee on top; the non-profit nets the price.
    const totalCents = grossUp(priceCents, NONPROFIT_APP_FEE_RATE);
    const feeCents = totalCents - priceCents;
    // The whole service fee is ours: it covers Stripe's bill and our platform fee, so the non-profit nets the price.
    const appFeeCents = feeCents;
    const price = priceCents / 100;
    const fmv = Math.min(Number(level.fair_market_value), price);

    const orgName =
      promoter.nonprofit_legal_name ||
      promoter.company_name ||
      promoter.contact_name;

    const { data: order, error: insertError } = await admin
      .from('sponsorship_orders')
      .insert({
        sponsorship_level_id: level.id,
        public_event_id: event.id,
        promoter_account_id: promoter.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: clean(dto.buyerPhone, 30),
        company_name: clean(dto.companyName, 120),
        event_title: event.title,
        event_date: event.event_date,
        level_name: level.name,
        org_name: orgName,
        org_ein: promoter.nonprofit_ein,
        tables_included: level.tables_included,
        seats_per_table: level.seats_per_table,
        tickets_included: level.tickets_included,
        price,
        fair_market_value: fmv,
        deductible_amount: Math.max(price - fmv, 0),
        service_fee: feeCents / 100,
        total_charged: totalCents / 100,
      })
      .select('id')
      .single();
    if (insertError || !order) {
      this.logger.error(
        `Sponsorship order insert failed: ${insertError?.message}`,
      );
      throw new BadRequestException('Could not start checkout.');
    }

    const base = `${this.frontendUrl}/events/${event.id}/sponsor`;
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: buyerEmail,
        // Sponsorships are treated as contributions, so Stripe Tax is off.
        automatic_tax: { enabled: false },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${event.title} \u2014 ${level.name} sponsorship`,
                description: orgName ?? undefined,
              },
              unit_amount: priceCents,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Service fee',
                description: 'Covers payment processing and platform fee',
              },
              unit_amount: feeCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: appFeeCents,
          transfer_data: { destination: promoter.stripe_account_id },
        },
        expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
        success_url: `${base}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}?canceled=true`,
        metadata: {
          sponsorship_order_id: order.id,
          public_event_id: event.id,
        },
      });

      await admin
        .from('sponsorship_orders')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', order.id);
      return { url: session.url, sessionId: session.id };
    } catch (err) {
      await admin.from('sponsorship_orders').delete().eq('id', order.id);
      this.logger.error(
        `Sponsorship checkout failed: ${(err as Error).message}`,
      );
      throw new BadRequestException('Could not start checkout.');
    }
  }

  /** Stripe webhook: marks the order paid once and emails the receipt. */
  async markPaidBySession(
    sessionId: string,
    paymentIntentId: string | null,
  ): Promise<boolean> {
    const admin = this.supabase.getAdminClient();
    const { data: order } = await admin
      .from('sponsorship_orders')
      .select(
        'id, sponsorship_level_id, public_event_id, buyer_name, buyer_email, company_name, event_title, event_date, level_name, org_name, org_ein, tables_included, seats_per_table, tickets_included, price, fair_market_value, deductible_amount, service_fee, total_charged',
      )
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();
    if (!order) return false;
    const row = order as unknown as OrderRow;

    const { data: changed, error } = await admin.rpc('mark_sponsorship_paid', {
      p_order_id: row.id,
      p_payment_intent: paymentIntentId,
    });
    if (error) {
      // Let the webhook fail so Stripe retries.
      throw new Error(`mark_sponsorship_paid failed: ${error.message}`);
    }
    if (changed !== true) return false;

    if (row.sponsorship_level_id) {
      const { data: level } = await admin
        .from('sponsorship_levels')
        .select('quantity_sold, quantity_available')
        .eq('id', row.sponsorship_level_id)
        .maybeSingle();
      if (
        level?.quantity_available != null &&
        level.quantity_sold > level.quantity_available
      ) {
        this.logger.warn(
          `Sponsorship level ${row.sponsorship_level_id} oversold (${level.quantity_sold}/${level.quantity_available})`,
        );
      }
    }

    await this.mail.sendSponsorshipReceipt({
      toEmail: row.buyer_email,
      buyerName: row.buyer_name,
      companyName: row.company_name,
      eventTitle: row.event_title,
      eventDate: row.event_date,
      eventId: row.public_event_id,
      levelName: row.level_name,
      orgName: row.org_name,
      orgEin: row.org_ein,
      tablesIncluded: row.tables_included,
      seatsPerTable: row.seats_per_table,
      ticketsIncluded: row.tickets_included,
      price: Number(row.price),
      fairMarketValue: Number(row.fair_market_value),
      deductibleAmount: Number(row.deductible_amount),
      serviceFee: Number(row.service_fee),
      totalCharged: Number(row.total_charged),
    });
    return true;
  }
}
