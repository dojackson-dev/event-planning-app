import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TicketEvolutionService } from './ticket-evolution.service';
import { TicketEvolutionWebhookController } from './ticket-evolution-webhook.controller';
import { TicketOrdersService } from './ticket-orders.service';

function setup(order: Record<string, unknown> | null = null) {
  const upsert = jest
    .fn<Promise<{ error: null }>, [Record<string, unknown>, unknown]>()
    .mockResolvedValue({ error: null });
  const from = jest.fn().mockReturnValue({ upsert });
  const supabase = {
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService;
  const getOrder = jest.fn().mockResolvedValue(order);
  const tevo = { getOrder } as unknown as TicketEvolutionService;
  const service = new TicketOrdersService(supabase, tevo);
  return { service, upsert, from, getOrder };
}

const apiOrder = {
  id: 456,
  oid: '123-456',
  state: 'accepted',
  fraud_check_status: 'approved',
  currency: 'USD',
  subtotal: '100.00',
  service_fee: 5,
  tax: 0,
  total: 105,
  wholesale_price: 90,
  commission: 10,
  created_at: '2026-10-15T12:00:00Z',
  event: { id: 982605, name: 'Test Event' },
  items: [{ quantity: 2 }, { quantity: 1 }],
  buyer: { type: 'Client', email: 'secret@example.com' },
};

describe('TicketOrdersService', () => {
  it('extracts the order id from body.id or the right side of oid', () => {
    const { service } = setup();
    expect(service.extractOrderId({ body: JSON.stringify({ id: 9 }) })).toBe(
      '9',
    );
    expect(service.extractOrderId({ body: { oid: '123-456' } })).toBe('456');
    expect(service.extractOrderId({ order_group_id: '77-88' })).toBe('88');
    expect(service.extractOrderId({})).toBeNull();
  });

  it('ignores non-order events without touching the API or DB', async () => {
    const { service, getOrder, from } = setup(apiOrder);
    const result = await service.handleWebhook('production', {
      event_type: 'event_updated',
      body: { id: 1 },
    });
    expect(result.handled).toBe(false);
    expect(getOrder).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it('stores production orders from the API response, not the payload, with no PII', async () => {
    const { service, getOrder, upsert, from } = setup(apiOrder);
    const result = await service.handleWebhook('production', {
      event_type: 'order_created',
      body: { id: 456, total: 1 },
    });
    expect(result.handled).toBe(true);
    expect(getOrder).toHaveBeenCalledWith('456');
    expect(from).toHaveBeenCalledWith('ticket_orders');
    const [row, options] = upsert.mock.calls[0] as [
      Record<string, unknown>,
      { onConflict: string },
    ];
    expect(options.onConflict).toBe('environment,order_id');
    expect(row).toMatchObject({
      environment: 'production',
      order_id: '456',
      verified: true,
      total: 105,
      subtotal: 100,
      commission: 10,
      wholesale_price: 90,
      quantity: 3,
      tevo_event_id: 982605,
      buyer_type: 'Client',
      fraud_check_status: 'approved',
    });
    expect(JSON.stringify(row)).not.toContain('secret@example.com');
  });

  it('stores sandbox orders from the payload as unverified without calling the API', async () => {
    const { service, getOrder, upsert } = setup(null);
    await service.handleWebhook('sandbox', {
      event_type: 'order_created',
      body: JSON.stringify({ id: 5, total: 20, state: 'accepted' }),
    });
    expect(getOrder).not.toHaveBeenCalled();
    expect(upsert.mock.calls[0][0]).toMatchObject({
      environment: 'sandbox',
      order_id: '5',
      verified: false,
      total: 20,
    });
  });

  it('records canceled state updates for an existing order', async () => {
    const { service, upsert } = setup({ ...apiOrder, state: 'canceled' });
    await service.handleWebhook('production', {
      event_type: 'order_canceled',
      body: { id: 456 },
    });
    expect(upsert.mock.calls[0][0]).toMatchObject({
      state: 'canceled',
      last_event_type: 'order_canceled',
    });
  });
});

describe('TicketEvolutionWebhookController', () => {
  function controller(secret?: string) {
    const handleWebhook = jest.fn().mockResolvedValue({ handled: true });
    const orders = { handleWebhook } as unknown as TicketOrdersService;
    const config = {
      get: () => secret,
    } as unknown as ConfigService;
    return {
      ctrl: new TicketEvolutionWebhookController(orders, config),
      handleWebhook,
    };
  }

  it('404s when the secret is not configured or does not match', async () => {
    await expect(
      controller(undefined).ctrl.receive('x', 'production', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    const { ctrl, handleWebhook } = controller('right-secret');
    await expect(
      ctrl.receive('wrong-secret', 'production', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it('404s on an unknown environment segment', async () => {
    await expect(
      controller('s').ctrl.receive('s', 'staging', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates to the service when the secret matches', async () => {
    const { ctrl, handleWebhook } = controller('s');
    const payload = { event_type: 'order_created' };
    await expect(ctrl.receive('s', 'sandbox', payload)).resolves.toEqual({
      handled: true,
    });
    expect(handleWebhook).toHaveBeenCalledWith('sandbox', payload);
  });
});
