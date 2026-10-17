import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { PromoterEventsService } from '../promoter-events/promoter-events.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  assertNonprofitCanSell,
  NONPROFIT_SALES_PAUSED_MESSAGE,
  nonprofitSalesBlocked,
} from './nonprofit-gate';
import { IrsLookupService } from './irs-lookup.service';
import { NonprofitService } from './nonprofit.service';
import { SponsorshipService } from './sponsorship.service';

/** Chainable supabase stub; `answers` maps table -> row returned by single()/maybeSingle(). */
function db(answers: Record<string, unknown>) {
  const ops: Array<{ table: string; op: string; arg?: unknown }> = [];
  const from = (table: string) => {
    const b: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq', 'neq', 'order', 'range', 'gte', 'lte']) {
      b[m] = jest.fn().mockReturnValue(b);
    }
    for (const m of ['insert', 'update', 'delete']) {
      b[m] = jest.fn().mockImplementation((arg?: unknown) => {
        ops.push({ table, op: m, arg });
        return b;
      });
    }
    const one = () =>
      Promise.resolve({ data: answers[table] ?? null, error: null });
    b.maybeSingle = jest.fn().mockImplementation(one);
    b.single = jest.fn().mockImplementation(one);
    (b as unknown as { then: unknown }).then = (
      resolve: (v: unknown) => unknown,
    ) => resolve({ data: answers[`${table}[]`] ?? [], error: null });
    return b;
  };
  return {
    ops,
    supabase: {
      getAdminClient: () => ({ from }),
    } as unknown as SupabaseService,
  };
}

describe('non-profit sales gate', () => {
  it('blocks only declared-but-unverified non-profits', () => {
    expect(
      nonprofitSalesBlocked({
        is_nonprofit: false,
        nonprofit_status: 'unverified',
      }),
    ).toBe(false);
    expect(
      nonprofitSalesBlocked({
        is_nonprofit: true,
        nonprofit_status: 'verified',
      }),
    ).toBe(false);
    expect(
      nonprofitSalesBlocked({
        is_nonprofit: true,
        nonprofit_status: 'unverified',
      }),
    ).toBe(true);
    expect(
      nonprofitSalesBlocked({
        is_nonprofit: true,
        nonprofit_status: 'rejected',
      }),
    ).toBe(true);
    expect(nonprofitSalesBlocked(null)).toBe(false);
    expect(() =>
      assertNonprofitCanSell({
        is_nonprofit: true,
        nonprofit_status: 'rejected',
      }),
    ).toThrow(NONPROFIT_SALES_PAUSED_MESSAGE);
  });
});

describe('PromoterEventsService gating', () => {
  const unverified = { is_nonprofit: true, nonprofit_status: 'unverified' };

  function service(answers: Record<string, unknown>) {
    const { supabase, ops } = db(answers);
    const config = {
      get: (k: string) =>
        k === 'STRIPE_SECRET_KEY' ? 'sk_test_dummy' : undefined,
    } as unknown as ConfigService;
    return {
      ops,
      svc: new PromoterEventsService(
        supabase,
        config,
        {} as unknown as MailService,
        {} as unknown as SmsNotificationsService,
      ),
    };
  }

  it('refuses to publish an event while unverified', async () => {
    const { svc, ops } = service({
      promoter_accounts: { id: 'p1', ...unverified },
    });
    await expect(
      svc.createEvent('u1', {
        title: 'Gala',
        event_date: '2026-12-01',
        status: 'published',
      } as never),
    ).rejects.toThrow(NONPROFIT_SALES_PAUSED_MESSAGE);
    expect(
      ops.some((o) => o.table === 'public_events' && o.op === 'insert'),
    ).toBe(false);
  });

  it('still lets an unverified non-profit save a draft', async () => {
    const { svc, ops } = service({
      promoter_accounts: { id: 'p1', ...unverified },
      public_events: { id: 'e1', ticket_tiers: [] },
    });
    await svc.createEvent('u1', {
      title: 'Gala',
      event_date: '2026-12-01',
    } as never);
    expect(
      ops.some((o) => o.table === 'public_events' && o.op === 'insert'),
    ).toBe(true);
  });

  it('refuses ticket checkout for an unverified non-profit', async () => {
    const { svc } = service({
      public_events: {
        id: 'e1',
        title: 'Gala',
        event_date: '2026-12-01',
        promoter_accounts: {
          stripe_account_id: 'acct_1',
          stripe_connect_status: 'active',
          ...unverified,
        },
      },
      ticket_tiers: {
        id: 't1',
        name: 'GA',
        price: 10,
        quantity: 10,
        quantity_sold: 0,
      },
    });
    await expect(
      svc.createTicketCheckout('e1', 't1', 1, undefined, 'a@b.co'),
    ).rejects.toThrow(NONPROFIT_SALES_PAUSED_MESSAGE);
  });

  it('flags a public event as sales_paused', async () => {
    const { svc } = service({
      public_events: {
        id: 'e1',
        promoter_accounts: unverified,
        ticket_tiers: [],
      },
    });
    expect(await svc.getPublicEvent('e1')).toMatchObject({
      sales_paused: true,
    });
    const { svc: ok } = service({
      public_events: {
        id: 'e1',
        promoter_accounts: { is_nonprofit: true, nonprofit_status: 'verified' },
        ticket_tiers: [],
      },
    });
    expect(await ok.getPublicEvent('e1')).toMatchObject({
      sales_paused: false,
    });
  });
});

describe('SponsorshipService.listPublic visibility', () => {
  const level = {
    id: 'l1',
    name: 'Gold',
    price: 1000,
    fair_market_value: 0,
    quantity_available: 5,
    quantity_sold: 1,
    tables_included: 0,
    seats_per_table: 0,
    tickets_included: 0,
    benefits: [],
    is_active: true,
  };
  const active = {
    is_nonprofit: true,
    nonprofit_status: 'verified',
    stripe_account_id: 'acct_1',
    stripe_connect_status: 'active',
  };

  function svc(promoter: Record<string, unknown> | null) {
    const { supabase } = db({
      public_events: {
        id: 'e1',
        status: 'published',
        promoter_account_id: 'p1',
      },
      promoter_accounts: promoter,
      'sponsorship_levels[]': [level],
    });
    return new SponsorshipService(supabase, {} as unknown as NonprofitService);
  }

  it('shows levels when the promoter is verified and Stripe is active', async () => {
    const rows = (await svc(active).listPublic('e1')) as Array<{
      remaining: number;
      buyer_total: number;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].remaining).toBe(4);
    expect(rows[0].buyer_total).toBeGreaterThan(1000);
  });

  it('hides levels unless verified and payment-ready', async () => {
    for (const patch of [
      { nonprofit_status: 'unverified' },
      { nonprofit_status: 'rejected' },
      { is_nonprofit: false },
      { stripe_connect_status: 'pending' },
      { stripe_account_id: null },
    ]) {
      expect(await svc({ ...active, ...patch }).listPublic('e1')).toEqual([]);
    }
    expect(await svc(null).listPublic('e1')).toEqual([]);
  });
});

describe('NonprofitService.setDeclared', () => {
  function build() {
    const { supabase, ops } = db({
      promoter_accounts: {
        id: 'p1',
        is_nonprofit: false,
        nonprofit_status: 'verified',
        nonprofit_ein: '123456789',
        nonprofit_legal_name: 'Helping Hands',
        nonprofit_verified_at: null,
        nonprofit_check: null,
      },
    });
    return {
      service: new NonprofitService(
        supabase,
        {} as unknown as IrsLookupService,
      ),
      ops,
    };
  }

  it('rejects a non-boolean value', async () => {
    const { service } = build();
    await expect(service.setDeclared('u1', 'yes')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('declaring only sets the flag and keeps any existing verification', async () => {
    const { service, ops } = build();
    await service.setDeclared('u1', true);
    const update = ops.find((o) => o.op === 'update')?.arg as Record<
      string,
      unknown
    >;
    expect(update.is_nonprofit).toBe(true);
    expect(update).not.toHaveProperty('nonprofit_status');
  });

  it('undeclaring clears verification so it must be redone', async () => {
    const { service, ops } = build();
    await service.setDeclared('u1', false);
    expect(ops.find((o) => o.op === 'update')?.arg).toMatchObject({
      is_nonprofit: false,
      nonprofit_status: 'unverified',
      nonprofit_verified_at: null,
    });
  });
});

// Keeps NotFoundException referenced for readers: unknown events still 404.
describe('SponsorshipService.listPublic unknown event', () => {
  it('404s', async () => {
    const { supabase } = db({});
    const service = new SponsorshipService(
      supabase,
      {} as unknown as NonprofitService,
    );
    await expect(service.listPublic('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
