import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

function setup(vendorStatus: string, stripeAccount?: Record<string, unknown>) {
  const invoice = {
    id: 'inv-1',
    invoice_number: 'BINV-2026-00001',
    status: 'sent',
    invoice_type: 'owner_booking',
    amount_due: 800,
    client_email: 'owner@example.test',
    vendor_account_id: 'vendor-1',
    vendor_accounts: {
      stripe_account_id: 'acct_test',
      stripe_connect_status: vendorStatus,
      business_name: 'DJ Vision',
      enable_bnpl: false,
    },
  };
  const updates: Array<{ table: string; values: unknown }> = [];
  const database = {
    from: (table: string) => {
      const query: Record<string, jest.Mock> = {};
      for (const method of ['select', 'eq'])
        query[method] = jest.fn(() => query);
      query.single = jest
        .fn()
        .mockResolvedValue({ data: invoice, error: null });
      query.update = jest.fn((values: unknown) => {
        updates.push({ table, values });
        return query;
      });
      query.then = jest.fn((resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
      );
      return query;
    },
  };
  const service = new VendorInvoicesService(
    { getAdminClient: () => database } as unknown as SupabaseService,
    {
      get: (key: string, fallback?: string) =>
        key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
    } as unknown as ConfigService,
    {} as SmsNotificationsService,
  );
  const retrieve = jest.fn().mockResolvedValue(stripeAccount);
  const create = jest
    .fn()
    .mockResolvedValue({ id: 'cs_1', url: 'https://checkout.test/cs_1' });
  (service as unknown as { stripe: unknown }).stripe = {
    accounts: { retrieve },
    checkout: { sessions: { create } },
  };
  return { service, retrieve, create, updates };
}

const ready = {
  details_submitted: true,
  charges_enabled: true,
  payouts_enabled: true,
};

describe('Vendor invoice checkout and Stripe readiness', () => {
  it('does not call Stripe when the saved status is already active', async () => {
    const { service, retrieve } = setup('active');
    await expect(service.createCheckoutSession('tok')).resolves.toMatchObject({
      url: 'https://checkout.test/cs_1',
    });
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('confirms a pending vendor with Stripe, saves it as active, and takes the payment', async () => {
    const { service, create, updates } = setup('pending', ready);
    await expect(service.createCheckoutSession('tok')).resolves.toMatchObject({
      url: 'https://checkout.test/cs_1',
    });
    expect(updates).toContainEqual({
      table: 'vendor_accounts',
      values: { stripe_connect_status: 'active' },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('still refuses payment while Stripe says onboarding is incomplete', async () => {
    const { service, create, updates } = setup('pending', {
      ...ready,
      charges_enabled: false,
    });
    await expect(service.createCheckoutSession('tok')).rejects.toThrow(
      BadRequestException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(updates.filter((u) => u.table === 'vendor_accounts')).toHaveLength(
      0,
    );
  });

  it('refuses payment, rather than failing open, when Stripe cannot be reached', async () => {
    const { service, retrieve, create } = setup('pending');
    retrieve.mockRejectedValueOnce(new Error('network'));
    await expect(service.createCheckoutSession('tok')).rejects.toThrow(
      BadRequestException,
    );
    expect(create).not.toHaveBeenCalled();
  });
});
