import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TicketEvolutionService } from './ticket-evolution.service';

export type TicketOrderEnvironment = 'production' | 'sandbox';

export interface TicketOrderWebhookPayload {
  order_group_id?: string | number;
  event_type?: string;
  body?: unknown;
  [key: string]: unknown;
}

type Json = Record<string, unknown>;

// Order lifecycle events we track. Anything else (event-catalog updates etc.)
// is acknowledged and ignored.
const ORDER_EVENT_PREFIXES = ['order_', 'fraud_response_'];

function asObject(value: unknown): Json | null {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Json) : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' ? (value as Json) : null;
}

function toMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value: unknown): string | null {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number') return String(value);
  return null;
}

function toDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

@Injectable()
export class TicketOrdersService {
  private readonly logger = new Logger(TicketOrdersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly ticketEvolution: TicketEvolutionService,
  ) {}

  /** The order id is the right-hand part of an `oid` like "123-456". */
  extractOrderId(payload: TicketOrderWebhookPayload): string | null {
    const body = asObject(payload.body);
    const direct = toText(body?.id) ?? toText(asObject(body?.order)?.id);
    if (direct) return direct;

    const oid = toText(body?.oid) ?? toText(payload.order_group_id);
    if (!oid) return null;
    const last = oid.split('-').pop();
    return last && /^\d+$/.test(last) ? last : null;
  }

  /**
   * Handles one order webhook delivery. Returns what was done so the
   * controller can respond 200 quickly. Unsigned webhooks: production
   * orders are re-fetched from the TEvo API and only that data is stored.
   */
  async handleWebhook(
    environment: TicketOrderEnvironment,
    payload: TicketOrderWebhookPayload,
  ): Promise<{ handled: boolean; reason?: string }> {
    const eventType = toText(payload.event_type) ?? '';
    if (!ORDER_EVENT_PREFIXES.some((p) => eventType.startsWith(p))) {
      return { handled: false, reason: 'ignored event type' };
    }

    const orderId = this.extractOrderId(payload);
    if (!orderId) {
      this.logger.warn(`TEvo webhook ${eventType}: no order id in payload`);
      return { handled: false, reason: 'no order id' };
    }

    let order: Json | null;
    let verified = false;
    if (environment === 'production') {
      order = await this.ticketEvolution.getOrder(orderId);
      if (!order) {
        this.logger.warn(`TEvo order ${orderId} not found via API`);
        return { handled: false, reason: 'order not found' };
      }
      verified = true;
    } else {
      order = asObject(payload.body);
      if (!order) return { handled: false, reason: 'no body' };
    }

    const row = this.toRow(environment, orderId, order, verified, eventType);
    const { error } = await this.supabase
      .getAdminClient()
      .from('ticket_orders')
      .upsert(row, { onConflict: 'environment,order_id' });
    if (error) {
      this.logger.error(`ticket_orders upsert failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to store order');
    }
    return { handled: true };
  }

  private toRow(
    environment: TicketOrderEnvironment,
    orderId: string,
    order: Json,
    verified: boolean,
    eventType: string,
  ) {
    const items = Array.isArray(order.items) ? (order.items as Json[]) : [];
    const quantity = items.reduce(
      (sum, item) => sum + (toMoney(item.quantity) ?? 0),
      0,
    );
    const event = asObject(order.event) ?? asObject(items[0]?.event);
    const buyer = asObject(order.buyer);

    return {
      environment,
      order_id: orderId,
      oid: toText(order.oid),
      tevo_event_id: toMoney(event?.id),
      event_name: toText(event?.name),
      state: toText(order.state),
      fraud_check_status: toText(order.fraud_check_status),
      buyer_type: toText(buyer?.type ?? order.buyer_type),
      currency: toText(order.currency),
      quantity: items.length ? quantity : null,
      subtotal: toMoney(order.subtotal),
      service_fee: toMoney(order.service_fee),
      fees: toMoney(order.fees),
      tax: toMoney(order.tax),
      total: toMoney(order.total),
      wholesale_price: toMoney(order.wholesale_price),
      commission: toMoney(order.commission),
      refunded: toMoney(order.refunded),
      verified,
      ordered_at: toDate(order.created_at),
      last_event_type: eventType,
      updated_at: new Date().toISOString(),
    };
  }
}
