import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import { StaffPayoutsService } from './staff-payouts.service';

const OWNER = 'owner-1';
const OTHER = 'owner-2';
const M_READY = randomUUID();
const M_NEW = randomUUID();
const M_THEIRS = randomUUID();
const TOKEN = 'a'.repeat(32);

function shift(id: string, member: string, amount: number, extra = {}) {
  return {
    id,
    owner_id: OWNER,
    staff_member_id: member,
    title: 'Bar',
    shift_date: '2026-11-14',
    status: 'approved',
    approved_amount: amount,
    payout_id: null,
    ...extra,
  };
}

function setup(opts: { fee?: string; bank?: boolean } = {}) {
  const S1 = randomUUID();
  const S2 = randomUUID();
  const S3 = randomUUID();
  const db = new FakeDb({
    owner_accounts: [
      {
        id: 'oa1',
        primary_owner_id: OWNER,
        business_name: 'The Rookery',
        enable_bnpl: !!opts.bank,
      },
    ],
    users: [{ id: OWNER, email: 'events@therookeryms.com' }],
    staff_members: [
      {
        id: M_READY,
        owner_id: OWNER,
        name: 'Dee Booker',
        phone: '+16015550101',
        payout_status: 'ready',
        stripe_account_id: 'acct_dee',
        payout_setup_token: TOKEN,
      },
      {
        id: M_NEW,
        owner_id: OWNER,
        name: 'Sam Lee',
        phone: '+16015550102',
        payout_status: 'not_connected',
        stripe_account_id: null,
      },
      {
        id: M_THEIRS,
        owner_id: OTHER,
        name: 'Not Mine',
        phone: '+16015550103',
        payout_status: 'ready',
        stripe_account_id: 'acct_x',
      },
    ],
    staff_shifts: [
      shift(S1, M_READY, 110),
      shift(S2, M_READY, 40.5),
      shift(S3, M_NEW, 100),
      shift(randomUUID(), M_READY, 80, { status: 'submitted' }),
    ],
    vendor_accounts: [],
    staff_payouts: [],
    staff_payout_items: [],
  });
  db.nextId = () => randomUUID();
  const sms = { sendOne: jest.fn().mockResolvedValue(true) };
  const stripe: any = {
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_new' }),
      update: jest.fn().mockResolvedValue({}),
      retrieve: jest
        .fn()
        .mockResolvedValue({ id: 'acct', details_submitted: false }),
    },
    accountLinks: {
      create: jest
        .fn()
        .mockResolvedValue({ url: 'https://connect.stripe.com/setup/x' }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_1',
          url: 'https://checkout.stripe.com/pay/cs_1',
        }),
        expire: jest.fn().mockResolvedValue({ status: 'expired' }),
        retrieve: jest.fn().mockResolvedValue({ status: 'open' }),
      },
    },
    paymentIntents: {
      retrieve: jest.fn().mockResolvedValue({ latest_charge: 'ch_1' }),
    },
    transfers: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      create: jest.fn().mockImplementation(async (p: any) => ({
        id: `tr_${p.metadata.staff_payout_item_id.slice(0, 6)}`,
      })),
    },
  };
  const service = new StaffPayoutsService(
    { getAdminClient: () => db } as any,
    {
      get: (k: string) =>
        ({
          FRONTEND_URL: 'https://www.eventecos.com',
          STRIPE_SECRET_KEY: 'sk_test_x',
          STAFF_PAY_SERVICE_FEE_PERCENT: opts.fee,
        })[k],
    } as any,
    sms as any,
  );
  (service as any).stripe = stripe;
  return { db, sms, stripe, service, S1, S2, S3 };
}

describe('worker payout setup', () => {
  it('texts the worker a link and keeps the same token on resend', async () => {
    const { service, sms } = setup();
    const first = await service.sendSetupLink(OWNER, M_NEW);
    const again = await service.sendSetupLink(OWNER, M_NEW);
    expect(first.link).toBe(again.link);
    expect(first.link).toMatch(
      /^https:\/\/www\.eventecos\.com\/payout-setup\/[0-9a-f]{32}$/,
    );
    expect(sms.sendOne.mock.calls[0][1]).toContain('The Rookery');
  });

  it("will not text a worker who is ready, or another venue's worker", async () => {
    const { service } = setup();
    await expect(service.sendSetupLink(OWNER, M_READY)).rejects.toThrow(
      ConflictException,
    );
    await expect(service.sendSetupLink(OWNER, M_THEIRS)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates a Stripe account once and returns the onboarding page', async () => {
    const { service, stripe, db } = setup();
    const { link } = await service.sendSetupLink(OWNER, M_NEW);
    const token = link.split('/').pop()!;
    const out = await service.startSetup(token);
    expect(out.url).toContain('connect.stripe.com');
    expect(stripe.accounts.create.mock.calls[0][0].metadata).toEqual({
      staff_member_id: M_NEW,
    });
    expect(stripe.accounts.create.mock.calls[0][1].idempotencyKey).toBe(
      `staff-account-${M_NEW}`,
    );
    expect(db.rows('staff_members').find((m) => m.id === M_NEW)).toMatchObject({
      stripe_account_id: 'acct_new',
      payout_status: 'pending',
    });
    await service.startSetup(token);
    expect(stripe.accounts.create).toHaveBeenCalledTimes(1);
  });

  it('rejects bad links', async () => {
    const { service } = setup();
    await expect(service.setupView('nope')).rejects.toThrow(NotFoundException);
    await expect(service.startSetup('f'.repeat(32))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('marks the worker ready when Stripe says the account can receive transfers', async () => {
    const { service, stripe, db } = setup();
    db.rows('staff_members')[1].stripe_account_id = 'acct_new';
    db.rows('staff_members')[1].payout_status = 'pending';
    stripe.accounts.retrieve.mockResolvedValue({
      id: 'acct_new',
      details_submitted: true,
      payouts_enabled: true,
      capabilities: {
        transfers: 'active',
        tax_reporting_us_1099_misc: 'active',
      },
    });
    const token = (await service.sendSetupLink(OWNER, M_NEW)).link
      .split('/')
      .pop()!;
    expect(await service.setupView(token)).toMatchObject({
      worker_first_name: 'Sam',
      status: 'ready',
    });
    expect(db.rows('staff_members')[1].payout_status).toBe('ready');
  });

  it('keeps the worker pending until Stripe has their tax details, so every payment can be reported', async () => {
    const { service, stripe, db } = setup();
    db.rows('staff_members')[1].stripe_account_id = 'acct_new';
    db.rows('staff_members')[1].payout_status = 'pending';
    stripe.accounts.retrieve.mockResolvedValue({
      id: 'acct_new',
      details_submitted: true,
      payouts_enabled: true,
      capabilities: {
        transfers: 'active',
        tax_reporting_us_1099_misc: 'inactive',
      },
    });
    const token = (await service.sendSetupLink(OWNER, M_NEW)).link
      .split('/')
      .pop()!;
    expect(await service.setupView(token)).toMatchObject({
      status: 'pending',
    });
    expect(db.rows('staff_members')[1].payout_status).toBe('pending');
  });

  it('asks Stripe to collect tax details on new accounts and adds that to older ones', async () => {
    const { service, stripe } = setup();
    const token = (await service.sendSetupLink(OWNER, M_NEW)).link
      .split('/')
      .pop()!;
    await service.startSetup(token);
    expect(stripe.accounts.create.mock.calls[0][0].capabilities).toMatchObject({
      transfers: { requested: true },
      tax_reporting_us_1099_misc: { requested: true },
    });
    expect(stripe.accounts.update).not.toHaveBeenCalled();

    await service.startSetup(token);
    expect(stripe.accounts.update).toHaveBeenCalledWith('acct_new', {
      capabilities: { tax_reporting_us_1099_misc: { requested: true } },
    });
  });

  it('still opens the setup page if adding the capability to an older account fails', async () => {
    const { service, stripe } = setup();
    const token = (await service.sendSetupLink(OWNER, M_NEW)).link
      .split('/')
      .pop()!;
    await service.startSetup(token);
    stripe.accounts.update.mockRejectedValue(new Error('nope'));
    expect((await service.startSetup(token)).url).toContain(
      'connect.stripe.com',
    );
  });

  it('updates from the account.updated webhook, but only for a matching worker account', async () => {
    const { service, db } = setup();
    const ready = {
      id: 'acct_dee',
      metadata: { staff_member_id: M_READY },
      details_submitted: true,
      payouts_enabled: false,
      capabilities: {
        transfers: 'active',
        tax_reporting_us_1099_misc: 'active',
      },
    } as any;
    expect(await service.handleAccountUpdated(ready)).toBe(true);
    expect(db.rows('staff_members')[0].payout_status).toBe('pending');
    expect(
      await service.handleAccountUpdated({ ...ready, id: 'acct_other' }),
    ).toBe(false);
    expect(
      await service.handleAccountUpdated({ id: 'acct_v', metadata: {} } as any),
    ).toBe(false);
  });
});

describe('reusing an account the worker already has', () => {
  const READY_ACCOUNT = {
    id: 'acct_vendor',
    details_submitted: true,
    payouts_enabled: true,
    capabilities: { transfers: 'active', tax_reporting_us_1099_misc: 'active' },
  };

  async function tokenFor(service: StaffPayoutsService) {
    return (await service.sendSetupLink(OWNER, M_NEW)).link.split('/').pop()!;
  }

  it("pays into the worker's vendor Stripe account when the mobile number matches", async () => {
    const { service, stripe, db } = setup();
    db.rows('vendor_accounts').push({
      id: 'v1',
      phone: '+16015550102',
      is_active: true,
      stripe_account_id: 'acct_vendor',
    });
    stripe.accounts.retrieve.mockResolvedValue({
      ...READY_ACCOUNT,
      details_submitted: false,
    });
    const token = await tokenFor(service);
    expect(await service.setupView(token)).toMatchObject({
      has_existing_account: true,
    });

    const out: any = await service.startSetup(token);
    expect(out.url).toContain('connect.stripe.com');
    expect(stripe.accounts.create).not.toHaveBeenCalled();
    expect(stripe.accounts.update).toHaveBeenCalledWith('acct_vendor', {
      capabilities: { tax_reporting_us_1099_misc: { requested: true } },
    });
    expect(db.rows('staff_members').find((m) => m.id === M_NEW)).toMatchObject({
      stripe_account_id: 'acct_vendor',
      payout_status: 'pending',
    });
  });

  it('skips the signup pages when that account already has everything Stripe needs', async () => {
    const { service, stripe, db } = setup();
    db.rows('vendor_accounts').push({
      id: 'v1',
      phone: '+16015550102',
      is_active: true,
      stripe_account_id: 'acct_vendor',
    });
    stripe.accounts.retrieve.mockResolvedValue(READY_ACCOUNT);
    const out: any = await service.startSetup(await tokenFor(service));
    expect(out).toEqual({ url: null, ready: true });
    expect(stripe.accountLinks.create).not.toHaveBeenCalled();
    expect(
      db.rows('staff_members').find((m) => m.id === M_NEW)!.payout_status,
    ).toBe('ready');
  });

  it('reuses the account the same person already set up with another venue', async () => {
    const { service, stripe, db } = setup();
    db.rows('staff_members').find((m) => m.id === M_NEW)!.phone =
      '+16015550103';
    await service.startSetup(await tokenFor(service));
    expect(stripe.accounts.create).not.toHaveBeenCalled();
    expect(
      db.rows('staff_members').find((m) => m.id === M_NEW)!.stripe_account_id,
    ).toBe('acct_x');
  });

  it('starts a fresh account when two vendors share the number, an inactive vendor matches, or none match', async () => {
    const { service, stripe, db } = setup();
    db.rows('vendor_accounts').push(
      {
        id: 'v1',
        phone: '+16015550102',
        is_active: true,
        stripe_account_id: 'acct_a',
      },
      {
        id: 'v2',
        phone: '+16015550102',
        is_active: true,
        stripe_account_id: 'acct_b',
      },
      {
        id: 'v3',
        phone: '+16015550102',
        is_active: false,
        stripe_account_id: 'acct_c',
      },
    );
    const token = await tokenFor(service);
    expect(await service.setupView(token)).toMatchObject({
      has_existing_account: false,
    });
    await service.startSetup(token);
    expect(stripe.accounts.create).toHaveBeenCalledTimes(1);
  });

  it("keeps a linked worker up to date from the vendor account's webhook, without claiming it", async () => {
    const { service, db } = setup();
    db.rows('staff_members').find((m) => m.id === M_NEW)!.stripe_account_id =
      'acct_vendor';
    db.rows('staff_members').find((m) => m.id === M_NEW)!.payout_status =
      'pending';
    const claimed = await service.handleAccountUpdated({
      ...READY_ACCOUNT,
      metadata: { vendor_account_id: 'v1' },
    } as any);
    expect(claimed).toBe(false);
    expect(
      db.rows('staff_members').find((m) => m.id === M_NEW)!.payout_status,
    ).toBe('ready');
  });
});

describe('previewing a payment', () => {
  it('separates workers who can be paid from those still setting up', async () => {
    const { service } = setup();
    const p: any = await service.preview(OWNER);
    expect(p.payable_cents).toBe(15050);
    expect(p.waiting_cents).toBe(10000);
    expect(p.workers.map((w: any) => [w.name, w.ready])).toEqual([
      ['Dee Booker', true],
      ['Sam Lee', false],
    ]);
    expect(p.quotes.card.total_cents).toBeGreaterThan(15050);
    expect(p.quotes.bank).toBeNull();
  });

  it('offers bank payment only where the account has it', async () => {
    const { service } = setup({ bank: true });
    expect(((await service.preview(OWNER)) as any).quotes.bank).not.toBeNull();
  });

  it('shows nothing for another venue', async () => {
    const { service } = setup();
    const p: any = await service.preview(OTHER);
    expect(p.payable_cents).toBe(0);
  });
});

describe('starting a payment', () => {
  it("charges payroll + fee, reserves only ready workers' approved shifts, and links the checkout", async () => {
    const { service, stripe, db, S1, S2, S3 } = setup();
    const out: any = await service.createCheckout(OWNER, { method: 'card' });
    expect(out.url).toContain('checkout.stripe.com');
    expect(out.payroll_cents).toBe(15050);

    const args = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(args.payment_method_types).toEqual(['card']);
    expect(args.customer_email).toBe('events@therookeryms.com');
    expect(args.metadata.staff_payout_id).toBe(out.payout_id);
    expect(args.payment_intent_data.transfer_group).toBe(
      `staff_payout_${out.payout_id}`,
    );
    const lineTotal = args.line_items.reduce(
      (n: number, l: any) => n + l.price_data.unit_amount,
      0,
    );
    expect(lineTotal).toBe(out.total_cents);

    const shifts = db.rows('staff_shifts');
    expect(shifts.find((s) => s.id === S1)!.payout_id).toBe(out.payout_id);
    expect(shifts.find((s) => s.id === S2)!.payout_id).toBe(out.payout_id);
    expect(shifts.find((s) => s.id === S3)!.payout_id).toBeNull();
    expect(
      db
        .rows('staff_payout_items')
        .map((i) => i.amount_cents)
        .sort((a, b) => a - b),
    ).toEqual([4050, 11000]);
    expect(db.rows('staff_payouts')[0]).toMatchObject({
      status: 'pending_payment',
      stripe_checkout_session_id: 'cs_1',
    });
  });

  it('adds a service fee line when one is configured', async () => {
    const { service, stripe } = setup({ fee: '2' });
    await service.createCheckout(OWNER, {});
    const names =
      stripe.checkout.sessions.create.mock.calls[0][0].line_items.map(
        (l: any) => l.price_data.product_data.name,
      );
    expect(names).toContain('EventEcos service fee');
  });

  it('cannot start a second payment for shifts already in one', async () => {
    const { service } = setup();
    await service.createCheckout(OWNER, {});
    await expect(service.createCheckout(OWNER, {})).rejects.toThrow(
      'no approved shifts',
    );
  });

  it('refuses bank payment without it being enabled, and refuses when nobody is ready', async () => {
    const { service, db } = setup();
    await expect(
      service.createCheckout(OWNER, { method: 'bank' }),
    ).rejects.toThrow('Bank payment');
    db.rows('staff_members')[0].payout_status = 'pending';
    await expect(service.createCheckout(OWNER, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('frees the shifts if Stripe cannot create the checkout', async () => {
    const { service, stripe, db } = setup();
    stripe.checkout.sessions.create.mockRejectedValue(new Error('stripe down'));
    await expect(service.createCheckout(OWNER, {})).rejects.toThrow(
      'Nothing was charged',
    );
    expect(db.rows('staff_shifts').every((s) => s.payout_id === null)).toBe(
      true,
    );
    expect(db.rows('staff_payouts')[0].status).toBe('cancelled');
  });

  it('releases an abandoned checkout so its shifts can be paid again', async () => {
    const { service, db, stripe } = setup();
    await service.createCheckout(OWNER, {});
    db.rows('staff_payouts')[0].created_at = new Date(
      Date.now() - 3 * 3600_000,
    ).toISOString();
    const p: any = await service.preview(OWNER);
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith('cs_1');
    expect(p.payable_cents).toBe(15050);
    expect(db.rows('staff_payouts')[0].status).toBe('cancelled');
  });

  it('lets the owner cancel an unpaid checkout, but not one that already went through', async () => {
    const { service, stripe, db } = setup();
    const { payout_id } = (await service.createCheckout(OWNER, {})) as any;
    stripe.checkout.sessions.expire.mockRejectedValueOnce(
      new Error('complete'),
    );
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      status: 'complete',
    });
    await expect(service.cancel(OWNER, payout_id)).rejects.toThrow(
      'already gone through',
    );
    await service.cancel(OWNER, payout_id);
    expect(db.rows('staff_payouts')[0].status).toBe('cancelled');
    await expect(service.cancel(OTHER, payout_id)).rejects.toThrow(
      NotFoundException,
    );
  });
});

function paidSession(payoutId: string, status = 'paid') {
  return {
    id: 'cs_1',
    payment_status: status,
    payment_intent: 'pi_1',
    metadata: { staff_payout_id: payoutId },
  } as any;
}

describe("when the venue's payment succeeds", () => {
  it("transfers each worker's amount from the charge, marks shifts paid and texts them", async () => {
    const { service, stripe, db, sms, S1, S2 } = setup();
    const { payout_id } = (await service.createCheckout(OWNER, {})) as any;
    await service.onCheckoutCompleted(paidSession(payout_id));

    expect(stripe.transfers.create).toHaveBeenCalledTimes(2);
    for (const [params, opts] of stripe.transfers.create.mock.calls) {
      expect(params).toMatchObject({
        currency: 'usd',
        destination: 'acct_dee',
        source_transaction: 'ch_1',
        transfer_group: `staff_payout_${payout_id}`,
      });
      expect(opts.idempotencyKey).toMatch(/^staff-item-.+-1$/);
    }
    expect(
      stripe.transfers.create.mock.calls
        .map(([p]: any) => p.amount)
        .sort((a, b) => a - b),
    ).toEqual([4050, 11000]);
    const shifts = db.rows('staff_shifts');
    expect(shifts.find((s) => s.id === S1)!.status).toBe('paid');
    expect(shifts.find((s) => s.id === S2)!.status).toBe('paid');
    expect(db.rows('staff_payouts')[0]).toMatchObject({
      status: 'completed',
      stripe_charge_id: 'ch_1',
    });
    expect(
      sms.sendOne.mock.calls.filter(([, b]: any) =>
        b.includes('You were paid'),
      ),
    ).toHaveLength(2);
  });

  it('pays only once when Stripe sends the event twice', async () => {
    const { service, stripe } = setup();
    const { payout_id } = (await service.createCheckout(OWNER, {})) as any;
    await service.onCheckoutCompleted(paidSession(payout_id));
    await service.onCheckoutCompleted(paidSession(payout_id));
    await service.onAsyncPaymentSucceeded(paidSession(payout_id));
    expect(stripe.transfers.create).toHaveBeenCalledTimes(2);
  });

  it('ignores a session that is not the one the payment created', async () => {
    const { service, stripe } = setup();
    const { payout_id } = (await service.createCheckout(OWNER, {})) as any;
    await service.onCheckoutCompleted({
      ...paidSession(payout_id),
      id: 'cs_forged',
    });
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });

  it('waits for a bank debit to clear before paying anyone', async () => {
    const { service, stripe, db } = setup({ bank: true });
    const { payout_id } = (await service.createCheckout(OWNER, {
      method: 'bank',
    })) as any;
    await service.onCheckoutCompleted(paidSession(payout_id, 'unpaid'));
    expect(stripe.transfers.create).not.toHaveBeenCalled();
    expect(db.rows('staff_payouts')[0].status).toBe('processing');
    await service.onAsyncPaymentSucceeded(paidSession(payout_id, 'paid'));
    expect(stripe.transfers.create).toHaveBeenCalledTimes(2);
  });

  it('frees the shifts when the bank debit fails or the checkout expires', async () => {
    const { service, stripe, db } = setup({ bank: true });
    const { payout_id } = (await service.createCheckout(OWNER, {
      method: 'bank',
    })) as any;
    await service.onCheckoutCompleted(paidSession(payout_id, 'unpaid'));
    await service.onPaymentFailed(paidSession(payout_id, 'unpaid'));
    expect(db.rows('staff_payouts')[0].status).toBe('cancelled');
    expect(db.rows('staff_shifts').every((s) => s.payout_id === null)).toBe(
      true,
    );
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });
});

describe('when a transfer fails', () => {
  it('records it, keeps the other workers paid, and can be retried with a fresh key', async () => {
    const { service, stripe, db, S1, S2 } = setup();
    const { payout_id } = (await service.createCheckout(OWNER, {})) as any;
    let calls = 0;
    stripe.transfers.create.mockImplementation(async (p: any) => {
      calls += 1;
      if (calls === 1) throw new Error('Account restricted');
      return { id: `tr_${calls}` };
    });
    await service.onCheckoutCompleted(paidSession(payout_id));
    expect(db.rows('staff_payouts')[0].status).toBe('needs_attention');
    const items = db.rows('staff_payout_items');
    expect(items.filter((i) => i.status === 'failed')).toHaveLength(1);
    expect(items.find((i) => i.status === 'failed')!.error).toBe(
      'Account restricted',
    );
    const paid = db.rows('staff_shifts').filter((s) => s.status === 'paid');
    expect(paid).toHaveLength(1);

    stripe.transfers.create.mockClear();
    const after: any = await service.retry(OWNER, payout_id);
    expect(after.status).toBe('completed');
    expect(stripe.transfers.create).toHaveBeenCalledTimes(1);
    expect(stripe.transfers.create.mock.calls[0][1].idempotencyKey).toMatch(
      /-2$/,
    );
    expect(
      [S1, S2].every(
        (id) =>
          db.rows('staff_shifts').find((s) => s.id === id)!.status === 'paid',
      ),
    ).toBe(true);
  });

  it('never sends a transfer twice if one already went out but was not recorded', async () => {
    const { service, stripe, db } = setup();
    const { payout_id } = (await service.createCheckout(OWNER, {})) as any;
    const itemId = db.rows('staff_payout_items')[0].id;
    stripe.transfers.list.mockResolvedValue({
      data: [{ id: 'tr_already', metadata: { staff_payout_item_id: itemId } }],
    });
    await service.onCheckoutCompleted(paidSession(payout_id));
    expect(stripe.transfers.create).toHaveBeenCalledTimes(1);
    expect(
      db.rows('staff_payout_items').find((i) => i.id === itemId)!
        .stripe_transfer_id,
    ).toBe('tr_already');
  });

  it("only retries a payment that needs attention, and only the owner's", async () => {
    const { service } = setup();
    const { payout_id } = (await service.createCheckout(OWNER, {})) as any;
    await expect(service.retry(OWNER, payout_id)).rejects.toThrow(
      ConflictException,
    );
    await expect(service.retry(OTHER, payout_id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
