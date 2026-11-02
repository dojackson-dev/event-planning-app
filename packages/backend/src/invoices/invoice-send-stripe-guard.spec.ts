import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices-supabase.service';
import { VendorInvoicesService } from '../vendor-invoices/vendor-invoices.service';
import { ArtistInvoicesService } from '../artist-invoices/artist-invoices.service';
import { PromoterInvoicesService } from '../promoter-invoices/promoter-invoices.service';

/** Admin client whose `.from(table).select().eq().single()/maybeSingle()` returns the given row. */
function adminReturning(row: Record<string, unknown> | null) {
  const query: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: row, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
  };
  return { from: jest.fn().mockReturnValue(query) };
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return e as BadRequestException;
  }
  throw new Error('expected the call to be rejected');
}

describe('sending an invoice without a finished Stripe registration', () => {
  it('owner: blocks status "sent" and says to register with Stripe', async () => {
    const service = new InvoicesService({} as any, {} as any, {} as any);
    (service as any).ownerStripeState = jest
      .fn()
      .mockResolvedValue({ accountId: null, ready: false });
    const update = jest.fn();
    (service as any).update = update;

    const err = await rejection(
      service.updateStatus({} as any, 'owner-1', 'inv-1', 'sent'),
    );
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse()).toMatchObject({
      code: 'STRIPE_REGISTRATION_REQUIRED',
      connectStatus: 'not_connected',
      connectPath: '/dashboard/settings?tab=payouts',
    });
    expect(String((err.getResponse() as any).message)).toContain(
      'register with Stripe',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('owner: reports an unfinished registration as pending', async () => {
    const service = new InvoicesService({} as any, {} as any, {} as any);
    (service as any).ownerStripeState = jest
      .fn()
      .mockResolvedValue({ accountId: 'acct_1', ready: false });
    const err = await rejection(
      service.updateStatus({} as any, 'owner-1', 'inv-1', 'sent'),
    );
    expect(err.getResponse()).toMatchObject({ connectStatus: 'pending' });
  });

  it('owner: still allows other status changes (e.g. cancel) without Stripe', async () => {
    const service = new InvoicesService(
      {} as any,
      { invoiceSent: jest.fn() } as any,
      {} as any,
    );
    const ownerStripeState = jest.fn();
    (service as any).ownerStripeState = ownerStripeState;
    (service as any).update = jest.fn().mockResolvedValue({
      status: 'cancelled',
      invoice_number: 'INV-1',
    });
    (service as any).lookupClientPhone = jest.fn().mockResolvedValue(null);
    await service.updateStatus({} as any, 'owner-1', 'inv-1', 'cancelled');
    expect(ownerStripeState).not.toHaveBeenCalled();
  });

  it('owner: finds the Stripe state through a team membership', async () => {
    const service = new InvoicesService({} as any, {} as any, {} as any);
    const owners = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({
          data: {
            stripe_connect_id: 'acct_1',
            stripe_connect_status: 'active',
          },
        }),
    };
    const memberships = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      limit: jest
        .fn()
        .mockResolvedValue({ data: [{ owner_account_id: 'oa-1' }] }),
    };
    const from = jest.fn((table: string) =>
      table === 'memberships' ? memberships : owners,
    );
    (service as any).supabaseService = { getAdminClient: () => ({ from }) };
    await expect((service as any).ownerStripeState('staff-1')).resolves.toEqual(
      {
        accountId: 'acct_1',
        ready: true,
      },
    );
  });

  it.each([
    ['vendor', VendorInvoicesService, 'vendor_accounts', 'getVendorAccountId'],
    ['artist', ArtistInvoicesService, 'artist_accounts', 'getArtistAccountId'],
    [
      'promoter',
      PromoterInvoicesService,
      'promoter_accounts',
      'getPromoterAccountId',
    ],
  ] as const)(
    '%s: blocks send with a clear Stripe registration message',
    async (_role, Service, _table, accountIdMethod) => {
      const service: any = Object.create(Service.prototype);
      service.supabaseService = {
        getAdminClient: () =>
          adminReturning({
            stripe_account_id: null,
            stripe_connect_status: null,
          }),
      };
      service[accountIdMethod] = jest.fn().mockResolvedValue('acct-row');
      service.getInvoice = jest.fn();

      const err = await rejection(service.sendInvoice('user-1', 'inv-1'));
      expect(err.getResponse()).toMatchObject({
        code: 'STRIPE_REGISTRATION_REQUIRED',
        connectStatus: 'not_connected',
      });
      expect(String((err.getResponse() as any).message)).toContain(
        'register with Stripe',
      );
      expect(service.getInvoice).not.toHaveBeenCalled();
    },
  );

  it('vendor: an account with a Stripe id that is not active yet is "pending"', async () => {
    const service: any = Object.create(VendorInvoicesService.prototype);
    service.supabaseService = {
      getAdminClient: () =>
        adminReturning({
          stripe_account_id: 'acct_1',
          stripe_connect_status: 'pending',
        }),
    };
    service.getVendorAccountId = jest.fn().mockResolvedValue('va-1');
    const err = await rejection(service.sendInvoice('user-1', 'inv-1'));
    expect(err.getResponse()).toMatchObject({ connectStatus: 'pending' });
  });
});
