import { ClientPortalService } from './client-portal.service';
import { clientVisibleItems } from '../invoices/client-visible-items';

type Rows = Record<string, unknown[]>;

function service(tables: Rows) {
  const database = {
    from: (table: string) => {
      const query: Record<string, jest.Mock> = {};
      for (const method of ['select', 'in', 'not']) {
        query[method] = jest.fn(() => query);
      }
      query.then = jest.fn((resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: tables[table] ?? [], error: null }).then(
          resolve,
        ),
      );
      return query;
    },
  };
  const instance = new ClientPortalService(
    {} as never,
    {} as never,
    {} as never,
  );
  return {
    hide: (bookings: unknown[]) =>
      (
        instance as unknown as {
          hideOwnerBookedPricing: (
            db: unknown,
            rows: unknown[],
          ) => Promise<any[]>;
        }
      ).hideOwnerBookedPricing(database, bookings),
  };
}

const ownerBooked = {
  id: 'booking-1',
  event_id: 'event-1',
  booked_by_user_id: 'owner-1',
  agreed_amount: 800,
  deposit_amount: 100,
  deposit_paid: false,
  total_paid: 0,
  payment_status: 'unpaid',
  stripe_payment_intent_id: 'pi_secret',
  vendor: { business_name: 'DJ Vision' },
};

describe('ClientPortalService owner-booked vendor pricing', () => {
  const events = [{ id: 'event-1', owner_id: 'owner-1' }];

  it('removes the vendor price fields and says the invoice is not ready', async () => {
    const [result] = await service({ event: events }).hide([ownerBooked]);
    expect(result).toMatchObject({ price_hidden: true, invoice_ready: false });
    for (const field of [
      'agreed_amount',
      'deposit_amount',
      'deposit_paid',
      'total_paid',
      'payment_status',
      'stripe_payment_intent_id',
    ]) {
      expect(result).not.toHaveProperty(field);
    }
    expect(result.vendor.business_name).toBe('DJ Vision');
  });

  it('marks the invoice ready once a sent invoice includes the vendor', async () => {
    const [result] = await service({
      event: events,
      invoice_items: [{ invoice_id: 'inv-1', vendor_booking_id: 'booking-1' }],
      invoices: [{ id: 'inv-1' }],
    }).hide([ownerBooked]);
    expect(result).toMatchObject({ price_hidden: true, invoice_ready: true });
  });

  it('keeps the vendor price visible when the client booked the vendor', async () => {
    const clientBooked = { ...ownerBooked, booked_by_user_id: 'client-user' };
    const [result] = await service({ event: events }).hide([clientBooked]);
    expect(result.agreed_amount).toBe(800);
    expect(result).not.toHaveProperty('price_hidden');
  });

  it('leaves booking requests untouched', async () => {
    const request = {
      id: 'req-1',
      _source: 'booking_request',
      quoted_amount: 500,
    };
    const [result] = await service({}).hide([request]);
    expect(result).toEqual(request);
  });
});

describe('clientVisibleItems', () => {
  it('drops vendor-cost expense lines and keeps everything else', () => {
    expect(
      clientVisibleItems([
        { id: 1, item_type: 'revenue' },
        { id: 2, item_type: 'expense' },
        { id: 3 },
        { id: 4, item_type: 'internal_note' },
      ]).map((i) => i.id),
    ).toEqual([1, 3, 4]);
  });

  it('handles a missing list', () => {
    expect(clientVisibleItems(undefined)).toEqual([]);
  });
});
