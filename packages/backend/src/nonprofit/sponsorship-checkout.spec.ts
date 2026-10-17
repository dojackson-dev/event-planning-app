import { BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SponsorshipCheckoutService } from './sponsorship-checkout.service';

const LEVEL = '22222222-2222-4222-8222-222222222222';

interface Opts {
  promoter?: Record<string, unknown> | null;
  level?: Record<string, unknown> | null;
  recentPending?: number;
  order?: Record<string, unknown> | null;
  rpc?: { data: unknown; error: { message: string } | null };
  stripeFails?: boolean;
}

function setup(opts: Opts = {}) {
  const ops: Array<{ table: string; op: string; arg?: unknown }> = [];
  const level =
    opts.level === undefined
      ? {
          id: LEVEL,
          public_event_id: 'event-1',
          name: 'Gold',
          price: 1000,
          fair_market_value: 150,
          quantity_available: 5,
          quantity_sold: 1,
          tables_included: 1,
          seats_per_table: 10,
          tickets_included: 0,
          is_active: true,
        }
      : opts.level;
  const promoter =
    opts.promoter === undefined
      ? {
          id: 'promoter-1',
          company_name: 'Helping Hands Co',
          contact_name: 'Pat',
          is_nonprofit: true,
          nonprofit_status: 'verified',
          nonprofit_legal_name: 'Helping Hands',
          nonprofit_ein: '123456789',
          stripe_account_id: 'acct_123',
          stripe_connect_status: 'active',
        }
      : opts.promoter;

  const from = (table: string) => {
    const b: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq', 'gte'])
      b[m] = jest.fn().mockReturnValue(b);
    for (const m of ['insert', 'update', 'delete']) {
      b[m] = jest.fn().mockImplementation((arg?: unknown) => {
        ops.push({ table, op: m, arg });
        return b;
      });
    }
    const one = () => {
      if (table === 'sponsorship_levels') return { data: level };
      if (table === 'public_events') {
        return level
          ? {
              data: {
                id: 'event-1',
                title: 'Gala',
                event_date: '2026-12-01',
                promoter_account_id: 'promoter-1',
              },
            }
          : { data: null };
      }
      if (table === 'promoter_accounts') return { data: promoter };
      if (table === 'sponsorship_orders') {
        return {
          data: opts.order === undefined ? { id: 'order-1' } : opts.order,
          error: null,
        };
      }
      return { data: null };
    };
    b.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(one()));
    b.single = jest.fn().mockImplementation(() => Promise.resolve(one()));
    (b as unknown as { then: unknown }).then = (
      resolve: (v: unknown) => unknown,
    ) => resolve({ count: opts.recentPending ?? 0, error: null });
    return b;
  };

  const rpc = jest
    .fn()
    .mockResolvedValue(opts.rpc ?? { data: true, error: null });
  const supabase = {
    getAdminClient: () => ({ from, rpc }),
  } as unknown as SupabaseService;
  const config = {
    get: (key: string) =>
      key === 'STRIPE_SECRET_KEY' ? 'sk_test_dummy' : undefined,
  } as unknown as ConfigService;
  const sendSponsorshipReceipt = jest.fn().mockResolvedValue(undefined);
  const mail = { sendSponsorshipReceipt } as unknown as MailService;

  const service = new SponsorshipCheckoutService(supabase, config, mail);
  const sessionsCreate = opts.stripeFails
    ? jest.fn().mockRejectedValue(new Error('stripe down'))
    : jest
        .fn()
        .mockResolvedValue({ id: 'cs_test_1', url: 'https://stripe.test/pay' });
  (service as unknown as { stripe: unknown }).stripe = {
    checkout: { sessions: { create: sessionsCreate } },
  };
  return { service, ops, sessionsCreate, rpc, sendSponsorshipReceipt };
}

const buyer = { buyerName: ' Sam Sponsor ', buyerEmail: 'Sam@Example.com' };

describe('SponsorshipCheckoutService.createCheckout', () => {
  it('requires a name and a valid email', async () => {
    const { service } = setup();
    await expect(
      service.createCheckout(LEVEL, { buyerEmail: 'a@b.co' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createCheckout(LEVEL, { buyerName: 'Sam', buyerEmail: 'nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses when the promoter is not a verified, connected non-profit', async () => {
    for (const patch of [
      { nonprofit_status: 'rejected' },
      { is_nonprofit: false },
      { stripe_connect_status: 'pending' },
      { stripe_account_id: null },
    ]) {
      const { service, sessionsCreate } = setup({
        promoter: {
          id: 'promoter-1',
          is_nonprofit: true,
          nonprofit_status: 'verified',
          stripe_account_id: 'acct_123',
          stripe_connect_status: 'active',
          ...patch,
        },
      });
      await expect(service.createCheckout(LEVEL, buyer)).rejects.toThrow(
        /Payments not enabled/,
      );
      expect(sessionsCreate).not.toHaveBeenCalled();
    }
  });

  it('refuses a sold-out level', async () => {
    const { service } = setup({
      level: {
        id: LEVEL,
        public_event_id: 'event-1',
        name: 'Gold',
        price: 1000,
        fair_market_value: 0,
        quantity_available: 2,
        quantity_sold: 2,
        tables_included: 0,
        seats_per_table: 0,
        tickets_included: 0,
        is_active: true,
      },
    });
    await expect(service.createCheckout(LEVEL, buyer)).rejects.toThrow(
      /sold out/i,
    );
  });

  it('rate-limits repeated pending checkouts for one email', async () => {
    const { service } = setup({ recentPending: 5 });
    await expect(service.createCheckout(LEVEL, buyer)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('charges price plus fees, routes funds to the non-profit, and snapshots the order', async () => {
    const { service, ops, sessionsCreate } = setup();
    const result = await service.createCheckout(LEVEL, {
      ...buyer,
      companyName: 'Acme',
    });
    expect(result).toEqual({
      url: 'https://stripe.test/pay',
      sessionId: 'cs_test_1',
    });

    const params = sessionsCreate.mock.calls[0][0] as {
      automatic_tax: { enabled: boolean };
      line_items: Array<{ price_data: { unit_amount: number } }>;
      payment_intent_data: {
        application_fee_amount: number;
        transfer_data: { destination: string };
      };
      metadata: Record<string, string>;
      success_url: string;
    };
    // $1,000 price at the 1.5% non-profit rate: total = ceil((100000 + 30) / (1 - 0.029 - 0.015))
    expect(params.line_items[0].price_data.unit_amount).toBe(100000);
    expect(params.line_items[1].price_data.unit_amount).toBe(4634);
    expect(params.payment_intent_data.application_fee_amount).toBe(1570);
    expect(params.payment_intent_data.transfer_data.destination).toBe(
      'acct_123',
    );
    expect(params.automatic_tax.enabled).toBe(false);
    expect(params.metadata.sponsorship_order_id).toBe('order-1');
    expect(params.success_url).toContain(
      '/events/event-1/sponsor?success=true',
    );

    const insert = ops.find(
      (o) => o.table === 'sponsorship_orders' && o.op === 'insert',
    );
    expect(insert?.arg).toMatchObject({
      buyer_name: 'Sam Sponsor',
      buyer_email: 'sam@example.com',
      company_name: 'Acme',
      level_name: 'Gold',
      org_name: 'Helping Hands',
      org_ein: '123456789',
      price: 1000,
      fair_market_value: 150,
      deductible_amount: 850,
      service_fee: 46.34,
      total_charged: 1046.34,
    });
  });

  it('removes the pending order when Stripe fails', async () => {
    const { service, ops } = setup({ stripeFails: true });
    await expect(service.createCheckout(LEVEL, buyer)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(
      ops.some((o) => o.table === 'sponsorship_orders' && o.op === 'delete'),
    ).toBe(true);
  });
});

describe('SponsorshipCheckoutService.markPaidBySession', () => {
  const order = {
    id: 'order-1',
    sponsorship_level_id: LEVEL,
    public_event_id: 'event-1',
    buyer_name: 'Sam',
    buyer_email: 'sam@example.com',
    company_name: null,
    event_title: 'Gala',
    event_date: '2026-12-01',
    level_name: 'Gold',
    org_name: 'Helping Hands',
    org_ein: '123456789',
    tables_included: 1,
    seats_per_table: 10,
    tickets_included: 0,
    price: 1000,
    fair_market_value: 150,
    deductible_amount: 850,
    service_fee: 63.02,
    total_charged: 1063.02,
  };

  it('ignores unknown sessions', async () => {
    const { service, rpc } = setup({ order: null });
    expect(await service.markPaidBySession('cs_x', 'pi_1')).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('marks paid once and emails the receipt with the deductible amount', async () => {
    const { service, rpc, sendSponsorshipReceipt } = setup({ order });
    expect(await service.markPaidBySession('cs_test_1', 'pi_1')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('mark_sponsorship_paid', {
      p_order_id: 'order-1',
      p_payment_intent: 'pi_1',
    });
    expect(sendSponsorshipReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'sam@example.com',
        deductibleAmount: 850,
        fairMarketValue: 150,
      }),
    );
  });

  it('does not email again on a webhook retry', async () => {
    const { service, sendSponsorshipReceipt } = setup({
      order,
      rpc: { data: false, error: null },
    });
    expect(await service.markPaidBySession('cs_test_1', 'pi_1')).toBe(false);
    expect(sendSponsorshipReceipt).not.toHaveBeenCalled();
  });

  it('throws on a database error so Stripe retries the webhook', async () => {
    const { service } = setup({
      order,
      rpc: { data: null, error: { message: 'boom' } },
    });
    await expect(
      service.markPaidBySession('cs_test_1', 'pi_1'),
    ).rejects.toThrow(/boom/);
  });
});
