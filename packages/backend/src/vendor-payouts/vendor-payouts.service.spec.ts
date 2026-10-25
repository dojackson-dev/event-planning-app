import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseService } from '../supabase/supabase.service';
import {
  VendorPayoutsService,
  estimateInstantFeeCents,
} from './vendor-payouts.service';

function setup(opts: {
  vendor?: { id: string; stripe_account_id: string | null } | null;
  instantAvailable?: unknown;
}) {
  const supabase = {
    getAdminClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data:
                  opts.vendor === undefined
                    ? { id: 'v1', stripe_account_id: 'acct_vendor' }
                    : opts.vendor,
                error: null,
              }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseService;
  const service = new VendorPayoutsService(supabase, {
    get: () => 'sk_test_x',
  } as unknown as ConfigService);
  const retrieve = jest.fn().mockResolvedValue({
    instant_available: opts.instantAvailable ?? [],
  });
  const create = jest
    .fn()
    .mockResolvedValue({ id: 'po_1', status: 'in_transit', amount: 0 });
  (service as unknown as { stripe: unknown }).stripe = {
    balance: { retrieve },
    payouts: { create },
  };
  return { service, retrieve, create };
}

const available = (net: number, gross = net) => [
  {
    currency: 'usd',
    amount: gross,
    net_available: [{ amount: net, source_types: { card: net } }],
  },
];

describe('estimateInstantFeeCents', () => {
  it('applies 1.5% with a $0.50 minimum', () => {
    expect(estimateInstantFeeCents(45_000)).toBe(675);
    expect(estimateInstantFeeCents(80_000)).toBe(1200);
    expect(estimateInstantFeeCents(2_000)).toBe(50);
  });
});

describe('VendorPayoutsService.getStatus', () => {
  it('reports not connected when the vendor has no Stripe account', async () => {
    const { service, retrieve } = setup({
      vendor: { id: 'v1', stripe_account_id: null },
    });
    const s = await service.getStatus('u1');
    expect(s).toMatchObject({ connected: false, eligible: false });
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('is not eligible when Stripe shows no instant balance (limit is $0)', async () => {
    const { service } = setup({ instantAvailable: [] });
    expect(await service.getStatus('u1')).toMatchObject({
      connected: true,
      eligible: false,
      max_payout_cents: 0,
    });
  });

  it('uses the net amount after the platform fee as the maximum', async () => {
    const { service, retrieve } = setup({
      instantAvailable: available(44_300, 45_000),
    });
    expect(await service.getStatus('u1')).toMatchObject({
      eligible: true,
      max_payout_cents: 44_300,
    });
    expect(retrieve).toHaveBeenCalledWith(
      { expand: ['instant_available.net_available'] },
      { stripeAccount: 'acct_vendor' },
    );
  });

  it('throws NotFound when the user has no vendor account', async () => {
    const { service } = setup({ vendor: null });
    await expect(service.getStatus('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('VendorPayoutsService.requestInstantPayout', () => {
  it('rejects non-integer, tiny and non-number amounts without calling Stripe', async () => {
    const { service, create } = setup({ instantAvailable: available(50_000) });
    for (const bad of [undefined, '500', 12.5, 99, -1000, NaN]) {
      await expect(
        service.requestInstantPayout('u1', bad),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects more than the available instant balance, rechecked on the server', async () => {
    const { service, create } = setup({ instantAvailable: available(10_000) });
    await expect(
      service.requestInstantPayout('u1', 10_001),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates an instant payout on the vendor's own connected account", async () => {
    const { service, create } = setup({ instantAvailable: available(50_000) });
    create.mockResolvedValue({
      id: 'po_1',
      status: 'in_transit',
      amount: 45_000,
    });
    const out = await service.requestInstantPayout('u1', 45_000);
    expect(out).toMatchObject({
      id: 'po_1',
      amount_cents: 45_000,
      estimated_fee_cents: 675,
    });
    const [params, options] = create.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(params).toEqual({
      amount: 45_000,
      currency: 'usd',
      method: 'instant',
    });
    expect(options.stripeAccount).toBe('acct_vendor');
    expect(String(options.idempotencyKey)).toContain('instant-payout:v1:45000');
  });

  it('refuses when the vendor has not connected Stripe', async () => {
    const { service, create } = setup({
      vendor: { id: 'v1', stripe_account_id: null },
    });
    await expect(
      service.requestInstantPayout('u1', 5_000),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('turns a Stripe rejection into a clear message', async () => {
    const { service, create } = setup({ instantAvailable: available(50_000) });
    create.mockRejectedValue({
      type: 'StripeInvalidRequestError',
      code: 'instant_payouts_unsupported',
      message: 'Add a debit card to use instant payouts.',
    });
    await expect(service.requestInstantPayout('u1', 5_000)).rejects.toThrow(
      /Add a debit card/,
    );
  });
});
