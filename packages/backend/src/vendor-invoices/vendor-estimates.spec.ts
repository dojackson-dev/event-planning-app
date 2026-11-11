import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorEstimatesService } from './vendor-estimates.service';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { FakeDb } from './test-support/fake-db';
import {
  estimateTotals,
  nextEstimateNumber,
  validateEstimateInput,
} from './vendor-estimate-helpers';

const FUTURE = '2099-12-31';

function setup(estimate: Record<string, unknown> | null = {}) {
  const db = new FakeDb({
    vendor_accounts: [
      {
        id: 'v1',
        user_id: 'u1',
        business_name: 'Savour',
        phone: '+16015550100',
      },
      { id: 'v2', user_id: 'u2', business_name: 'Other' },
    ],
    vendor_estimates: estimate
      ? [
          {
            id: 'e1',
            vendor_account_id: 'v1',
            estimate_number: 'VEST-2026-00001',
            public_token: 'pub-token',
            client_name: 'Ann Lee',
            client_email: 'ann@example.com',
            client_phone: '+16015550111',
            issue_date: '2026-11-01',
            expiration_date: FUTURE,
            tax_rate: 10,
            discount_amount: 5,
            subtotal: 200,
            tax_amount: 20,
            total_amount: 215,
            status: 'approved',
            notes: 'Thanks',
            terms: 'Net 14',
            ...estimate,
          },
        ]
      : [],
    vendor_estimate_items: estimate
      ? [
          {
            id: 'ei1',
            vendor_estimate_id: 'e1',
            description: 'Chicken plates',
            quantity: 10,
            unit_price: 15,
            amount: 150,
            sort_order: 0,
          },
          {
            id: 'ei2',
            vendor_estimate_id: 'e1',
            description: 'Setup',
            quantity: 1,
            unit_price: 50,
            amount: 50,
            sort_order: 1,
          },
        ]
      : [],
  });
  const supabase = { getAdminClient: () => db } as unknown as SupabaseService;
  const config = {
    get: (key: string, fallback?: string) =>
      key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
  } as unknown as ConfigService;
  const sms = {
    vendorEstimateSent: jest.fn().mockResolvedValue(undefined),
    vendorEstimateResponded: jest.fn().mockResolvedValue(undefined),
  };
  const invoices = new VendorInvoicesService(
    supabase,
    config,
    {} as unknown as SmsNotificationsService,
  );
  const service = new VendorEstimatesService(
    supabase,
    config,
    sms as unknown as SmsNotificationsService,
    invoices,
  );
  return { db, service, sms, invoices };
}

describe('estimate helpers', () => {
  it('adds tax and subtracts the discount', () => {
    expect(
      estimateTotals(
        [
          { quantity: 10, unit_price: 15 },
          { quantity: 1, unit_price: 50 },
        ],
        10,
        5,
      ),
    ).toEqual({
      subtotal: 200,
      taxAmount: 20,
      totalAmount: 215,
    });
  });
  it('never goes below zero', () => {
    expect(
      estimateTotals([{ quantity: 1, unit_price: 10 }], 0, 50).totalAmount,
    ).toBe(0);
  });
  it('numbers estimates in sequence', () => {
    expect(nextEstimateNumber('VEST-2026-', null)).toBe('VEST-2026-00001');
    expect(nextEstimateNumber('VEST-2026-', 'VEST-2026-00009')).toBe(
      'VEST-2026-00010',
    );
  });
  it.each([
    [{ items: [] }, 'at least one'],
    [
      { items: [{ description: '', quantity: 1, unit_price: 1 }] },
      'description',
    ],
    [{ items: [{ description: 'a', quantity: 0, unit_price: 1 }] }, 'quantity'],
    [
      { items: [{ description: 'a', quantity: 1, unit_price: -1 }] },
      'unit price',
    ],
    [{ client_email: 'nope' }, 'email'],
    [{ issue_date: '2026-12-01', expiration_date: '2026-11-01' }, 'before'],
    [{ tax_rate: -1 }, 'tax rate'],
  ])('rejects invalid input %#', (input, message) => {
    expect(() => validateEstimateInput(input as never)).toThrow(message);
  });
});

describe('creating an estimate', () => {
  const dto = {
    client_name: 'Ann Lee',
    client_email: 'ann@example.com',
    issue_date: '2026-11-11',
    expiration_date: '2026-12-11',
    tax_rate: 10,
    discount_amount: 5,
    items: [
      { description: 'Chicken plates', quantity: 10, unit_price: 15 },
      { description: 'Setup', quantity: 1, unit_price: 50 },
    ],
  };

  it('saves itemized lines, totals and a draft status', async () => {
    const { db, service } = setup(null);
    const created = await service.create('u1', dto);
    expect(created).toMatchObject({
      status: 'draft',
      total_amount: 215,
      estimate_number: 'VEST-' + new Date().getFullYear() + '-00001',
    });
    expect(
      created.vendor_estimate_items.map((i: any) => i.description),
    ).toEqual(['Chicken plates', 'Setup']);
    expect(db.rows('vendor_estimates')).toHaveLength(1);
  });

  it('rejects an estimate without items', async () => {
    const { service } = setup(null);
    await expect(service.create('u1', { ...dto, items: [] })).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('editing and sending', () => {
  it('replaces the items and recalculates when a draft is edited', async () => {
    const { db, service } = setup({ status: 'draft' });
    await service.update('u1', 'e1', {
      tax_rate: 0,
      discount_amount: 0,
      items: [{ description: 'Buffet', quantity: 2, unit_price: 100 }],
    });
    expect(db.rows('vendor_estimates')[0]).toMatchObject({
      subtotal: 200,
      total_amount: 200,
    });
    expect(db.rows('vendor_estimate_items')).toHaveLength(1);
  });

  it('returns a viewed estimate to sent when the numbers change', async () => {
    const { db, service } = setup({ status: 'viewed' });
    await service.update('u1', 'e1', { notes: 'Updated notes' });
    expect(db.rows('vendor_estimates')[0].status).toBe('sent');
  });

  it.each(['approved', 'rejected', 'converted'])(
    'does not let a %s estimate be edited',
    async (status) => {
      const { service } = setup({ status });
      await expect(service.update('u1', 'e1', { notes: 'x' })).rejects.toThrow(
        'can no longer be edited',
      );
    },
  );

  it("hides one vendor's estimates from another", async () => {
    const { service } = setup({ status: 'draft' });
    await expect(service.get('u2', 'e1')).rejects.toThrow(NotFoundException);
    await expect(service.send('u2', 'e1')).rejects.toThrow(NotFoundException);
  });

  it('sends a draft to the client and texts the link', async () => {
    const { db, service, sms } = setup({ status: 'draft' });
    await expect(service.send('u1', 'e1')).resolves.toEqual({ success: true });
    expect(db.rows('vendor_estimates')[0].status).toBe('sent');
    expect(sms.vendorEstimateSent).toHaveBeenCalledWith(
      '+16015550111',
      'Ann Lee',
      'Savour',
      215,
      expect.stringContaining('/vendor-estimate/pub-token'),
    );
  });

  it('needs a client email before sending', async () => {
    const { service } = setup({ status: 'draft', client_email: null });
    await expect(service.send('u1', 'e1')).rejects.toThrow('client email');
  });
});

describe('the client viewing and answering', () => {
  it('marks it viewed and hides internal fields', async () => {
    const { db, service } = setup({
      status: 'sent',
      converted_invoice_id: 'x',
    });
    const shown: any = await service.getPublic('pub-token');
    expect(shown.status).toBe('viewed');
    expect(db.rows('vendor_estimates')[0].status).toBe('viewed');
    expect(shown.public_token).toBeUndefined();
    expect(shown.converted_invoice_id).toBeUndefined();
    expect(shown.vendor_estimate_items).toHaveLength(2);
  });

  it('does not show a draft', async () => {
    const { service } = setup({ status: 'draft' });
    await expect(service.getPublic('pub-token')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('approves, once, and tells the vendor', async () => {
    const { db, service, sms } = setup({ status: 'sent' });
    await expect(service.respond('pub-token', true)).resolves.toEqual({
      status: 'approved',
    });
    expect(db.rows('vendor_estimates')[0].status).toBe('approved');
    expect(sms.vendorEstimateResponded).toHaveBeenCalledWith(
      '+16015550100',
      'Savour',
      'Ann Lee',
      true,
      215,
    );
    await expect(service.respond('pub-token', false)).rejects.toThrow(
      'already approved',
    );
  });

  it('declines', async () => {
    const { db, service } = setup({ status: 'viewed' });
    await service.respond('pub-token', false);
    expect(db.rows('vendor_estimates')[0].status).toBe('rejected');
  });

  it('refuses an answer after the expiration date', async () => {
    const { service } = setup({
      status: 'sent',
      expiration_date: '2020-01-01',
    });
    await expect(service.respond('pub-token', true)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('converting to an invoice', () => {
  it('creates a draft invoice with the same itemized lines', async () => {
    const { db, service } = setup({ status: 'approved' });
    const result = await service.convertToInvoice('u1', 'e1', {
      due_date: FUTURE,
    });

    expect(result.already).toBe(false);
    const invoice = db.rows('vendor_invoices')[0];
    expect(invoice).toMatchObject({
      client_name: 'Ann Lee',
      client_email: 'ann@example.com',
      status: 'draft',
      tax_rate: 10,
      discount_amount: 5,
      total_amount: 215,
      due_date: FUTURE,
    });
    const lines = db
      .rows('vendor_invoice_items')
      .filter((i) => i.vendor_invoice_id === invoice.id);
    expect(lines.map((l) => [l.description, l.quantity, l.unit_price])).toEqual(
      [
        ['Chicken plates', 10, 15],
        ['Setup', 1, 50],
      ],
    );
    expect(db.rows('vendor_estimates')[0]).toMatchObject({
      status: 'converted',
      converted_invoice_id: result.invoice_id,
    });
  });

  it('is safe to press twice', async () => {
    const { db, service } = setup({ status: 'approved' });
    const first = await service.convertToInvoice('u1', 'e1', {
      due_date: FUTURE,
    });
    const second = await service.convertToInvoice('u1', 'e1', {
      due_date: FUTURE,
    });
    expect(second).toEqual({ invoice_id: first.invoice_id, already: true });
    expect(db.rows('vendor_invoices')).toHaveLength(1);
  });

  it('can convert straight from a draft, but not a declined estimate', async () => {
    const draft = setup({ status: 'draft' });
    await expect(
      draft.service.convertToInvoice('u1', 'e1', { due_date: FUTURE }),
    ).resolves.toMatchObject({ already: false });
    const declined = setup({ status: 'rejected' });
    await expect(
      declined.service.convertToInvoice('u1', 'e1', { due_date: FUTURE }),
    ).rejects.toThrow('cannot be converted');
  });

  it('rejects a due date in the past', async () => {
    const { service } = setup({ status: 'approved' });
    await expect(
      service.convertToInvoice('u1', 'e1', { due_date: '2020-01-01' }),
    ).rejects.toThrow('not in the past');
  });

  it('puts the estimate back if the invoice cannot be created', async () => {
    const { db, service, invoices } = setup({ status: 'approved' });
    jest
      .spyOn(invoices, 'createInvoice')
      .mockRejectedValue(new BadRequestException('boom'));
    await expect(
      service.convertToInvoice('u1', 'e1', { due_date: FUTURE }),
    ).rejects.toThrow('boom');
    expect(db.rows('vendor_estimates')[0].status).toBe('approved');
  });
});

describe('deleting', () => {
  it('removes a draft but keeps a converted estimate', async () => {
    const draft = setup({ status: 'draft' });
    await draft.service.remove('u1', 'e1');
    expect(draft.db.rows('vendor_estimates')).toHaveLength(0);

    const converted = setup({ status: 'converted' });
    await expect(converted.service.remove('u1', 'e1')).rejects.toThrow(
      'cannot be deleted',
    );
  });
});
