import { BadRequestException } from '@nestjs/common';
import { PromoterEventsService } from './promoter-events.service';

type Row = Record<string, any>;

const EVENT_ID = 'e1';
const FREE_TIER = {
  id: 't-free',
  name: 'General Admission',
  price: 0,
  quantity: 100,
  quantity_sold: 0,
  public_event_id: EVENT_ID,
};
const VIP_TIER = {
  id: 't-paid',
  name: 'VIP',
  price: 25,
  quantity: 10,
  quantity_sold: 0,
  public_event_id: EVENT_ID,
};

/** In-memory stand-in for the few Supabase calls the ticket flow makes. */
function fakeDb(tables: Record<string, Row[]>) {
  let seq = 0;
  return {
    from(table: string) {
      tables[table] ??= [];
      const filters: Array<(r: Row) => boolean> = [];
      let op: 'select' | 'insert' | 'update' = 'select';
      let payload: Row | Row[] = {};
      let countOnly = false;
      let max = Infinity;
      const q: any = {};
      q.select = (_c?: string, opts?: { head?: boolean }) => {
        if (op === 'select') countOnly = !!opts?.head;
        return q;
      };
      q.insert = (rows: Row | Row[]) => {
        op = 'insert';
        payload = rows;
        return q;
      };
      q.update = (patch: Row) => {
        op = 'update';
        payload = patch;
        return q;
      };
      q.eq = (col: string, val: unknown) => {
        filters.push((r) => r[col] === val);
        return q;
      };
      q.limit = (n: number) => {
        max = n;
        return q;
      };
      const run = (single: boolean) => {
        const rows = tables[table];
        if (op === 'insert') {
          for (const row of Array.isArray(payload) ? payload : [payload]) {
            rows.push({ id: `${table}-${++seq}`, ...row });
          }
          return Promise.resolve({ data: null, error: null });
        }
        const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'update') {
          hit.forEach((r) => Object.assign(r, payload));
          return Promise.resolve({ data: null, error: null });
        }
        if (countOnly) {
          return Promise.resolve({
            data: null,
            count: hit.length,
            error: null,
          });
        }
        return Promise.resolve({
          data: single ? (hit[0] ?? null) : hit.slice(0, max),
          error: null,
        });
      };
      q.single = () => run(true);
      q.maybeSingle = () => run(true);
      q.then = (resolve: (v: unknown) => unknown) => run(false).then(resolve);
      return q;
    },
  };
}

function setup(opts: { promoter?: Row; tiers?: Row[]; tickets?: Row[] } = {}) {
  const tables: Record<string, Row[]> = {
    public_events: [
      {
        id: EVENT_ID,
        title: 'Community Night',
        event_date: '2026-12-01',
        start_time: '18:00:00',
        venue_name: 'The Rookery',
        status: 'published',
        promoter_accounts: opts.promoter ?? {
          company_name: 'Rookery',
          contact_name: 'Dee',
          is_nonprofit: false,
          // no Stripe account at all: free tickets must not need one
          stripe_account_id: null,
          stripe_connect_status: 'not_connected',
        },
      },
    ],
    ticket_tiers: (opts.tiers ?? [FREE_TIER]).map((t) => ({ ...t })),
    tickets: opts.tickets ?? [],
  };
  const mail = {
    sendTicketConfirmation: jest.fn().mockResolvedValue(undefined),
  };
  const sms = {
    ticketPurchaseConfirmed: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    get: (k: string) =>
      k === 'FRONTEND_URL'
        ? 'https://www.eventecos.com'
        : k === 'STRIPE_SECRET_KEY'
          ? 'sk_test_dummy'
          : '',
  };
  const svc = new PromoterEventsService(
    { getAdminClient: () => fakeDb(tables) } as any,
    config as any,
    mail as any,
    sms as any,
  );
  const stripeCreate = jest
    .fn()
    .mockResolvedValue({ url: 'https://checkout.stripe.test/s', id: 'cs_1' });
  (svc as any).stripe = {
    checkout: { sessions: { create: stripeCreate, retrieve: jest.fn() } },
  };
  return { svc, tables, mail, sms, stripeCreate };
}

describe('free tickets', () => {
  it('reserves a free ticket without Stripe, even when the promoter has no Stripe account', async () => {
    const { svc, tables, mail, stripeCreate } = setup();
    const res = await svc.createTicketCheckout(
      EVENT_ID,
      FREE_TIER.id,
      2,
      '6015550100',
      'Guest@Example.com',
      undefined,
      'Pat Guest',
    );

    expect(stripeCreate).not.toHaveBeenCalled();
    expect(res).toMatchObject({ free: true });
    expect(res.sessionId).toMatch(/^free_/);
    expect(res.url).toBe(
      `https://www.eventecos.com/events/${EVENT_ID}?paid=true&session_id=${res.sessionId}`,
    );
    expect(tables.tickets).toHaveLength(2);
    expect(tables.tickets[0]).toMatchObject({
      public_event_id: EVENT_ID,
      ticket_tier_id: FREE_TIER.id,
      buyer_email: 'guest@example.com',
      stripe_checkout_session_id: res.sessionId,
      amount_paid: 0,
      status: 'valid',
    });
    expect(tables.ticket_tiers[0].quantity_sold).toBe(2);
    expect(mail.sendTicketConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'guest@example.com',
        amountTotal: 0,
        quantity: 2,
        sessionId: res.sessionId,
      }),
    );
  });

  it('texts the confirmation when a phone number was given', async () => {
    const { svc, sms } = setup();
    await svc.createTicketCheckout(
      EVENT_ID,
      FREE_TIER.id,
      1,
      '6015550100',
      'a@b.co',
    );
    expect(sms.ticketPurchaseConfirmed).toHaveBeenCalledTimes(1);
  });

  it('works for a cart of several free tiers', async () => {
    const second = { ...FREE_TIER, id: 't-free-2', name: 'Student' };
    const { svc, tables, stripeCreate } = setup({
      tiers: [FREE_TIER, second],
    });
    const res = await svc.createMultiTierCheckout(
      EVENT_ID,
      [
        { tier_id: FREE_TIER.id, quantity: 1 },
        { tier_id: second.id, quantity: 2 },
      ],
      undefined,
      'a@b.co',
    );
    expect(stripeCreate).not.toHaveBeenCalled();
    expect(res).toMatchObject({ free: true });
    expect(tables.tickets).toHaveLength(3);
  });

  it('follows the same pause as paid sales for a non-profit that is not verified yet', async () => {
    const { svc, tables } = setup({
      promoter: { is_nonprofit: true, nonprofit_status: 'pending' },
    });
    await expect(
      svc.createTicketCheckout(EVENT_ID, FREE_TIER.id, 1, undefined, 'a@b.co'),
    ).rejects.toThrow('paused');
    expect(tables.tickets).toHaveLength(0);
  });

  it('still uses Stripe for paid tickets, and for a cart that mixes free and paid', async () => {
    const { svc, stripeCreate } = setup({
      tiers: [FREE_TIER, VIP_TIER],
      promoter: {
        is_nonprofit: false,
        stripe_account_id: 'acct_1',
        stripe_connect_status: 'active',
      },
    });
    const res = await svc.createMultiTierCheckout(
      EVENT_ID,
      [
        { tier_id: FREE_TIER.id, quantity: 1 },
        { tier_id: VIP_TIER.id, quantity: 1 },
      ],
      undefined,
      'a@b.co',
    );
    expect(stripeCreate).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ url: 'https://checkout.stripe.test/s' });
  });

  it('keeps refusing paid tickets when the promoter has no active Stripe account', async () => {
    const { svc } = setup({ tiers: [VIP_TIER] });
    await expect(
      svc.createTicketCheckout(EVENT_ID, VIP_TIER.id, 1, undefined, 'a@b.co'),
    ).rejects.toThrow('Payments not enabled');
  });

  it('needs a valid email to send the tickets to', async () => {
    const { svc, tables } = setup();
    for (const email of [undefined, '', 'not-an-email']) {
      await expect(
        svc.createTicketCheckout(
          EVENT_ID,
          FREE_TIER.id,
          1,
          '6015550100',
          email,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(tables.tickets).toHaveLength(0);
  });

  it('stops one email from holding more than 10 free tickets for an event', async () => {
    const held = Array.from({ length: 9 }, (_, i) => ({
      id: `old-${i}`,
      public_event_id: EVENT_ID,
      buyer_email: 'a@b.co',
      status: 'valid',
    }));
    const { svc, tables } = setup({ tickets: held });
    await expect(
      svc.createTicketCheckout(EVENT_ID, FREE_TIER.id, 2, undefined, 'A@B.co'),
    ).rejects.toThrow('up to 10 free tickets');
    expect(tables.tickets).toHaveLength(9);
    await svc.createTicketCheckout(
      EVENT_ID,
      FREE_TIER.id,
      1,
      undefined,
      'a@b.co',
    );
    expect(tables.tickets).toHaveLength(10);
  });

  it('still refuses more tickets than are left', async () => {
    const { svc } = setup({
      tiers: [{ ...FREE_TIER, quantity: 5, quantity_sold: 4 }],
    });
    await expect(
      svc.createTicketCheckout(EVENT_ID, FREE_TIER.id, 2, undefined, 'a@b.co'),
    ).rejects.toThrow('Only 1 tickets remaining');
  });

  it('rejects zero or negative quantities in a free cart', async () => {
    const { svc, tables } = setup();
    await expect(
      svc.createMultiTierCheckout(
        EVENT_ID,
        [
          { tier_id: FREE_TIER.id, quantity: 5 },
          { tier_id: FREE_TIER.id, quantity: -3 },
        ],
        undefined,
        'a@b.co',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tables.tickets).toHaveLength(0);
  });

  it('does not look a free order up at Stripe when the success page confirms it', async () => {
    const { svc } = setup();
    const retrieve = (svc as any).stripe.checkout.sessions.retrieve;
    await svc.markTicketsSoldBySession('free_abc');
    expect(retrieve).not.toHaveBeenCalled();
  });
});
