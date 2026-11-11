import { ConfigService } from '@nestjs/config';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { FakeDb } from './test-support/fake-db';
import { clientKey, mergeVendorClients } from './vendor-clients';

describe('clientKey', () => {
  it('prefers email, then phone digits, then name', () => {
    expect(
      clientKey({
        client_email: ' Ann@Example.com ',
        client_phone: '555',
        client_name: 'Ann',
      }),
    ).toBe('e:ann@example.com');
    expect(clientKey({ client_phone: '(601) 555-0100' })).toBe('p:6015550100');
    expect(clientKey({ client_phone: '+1 601 555 0100' })).toBe('p:6015550100');
    expect(clientKey({ client_name: 'Ann Lee' })).toBe('n:ann lee');
    expect(clientKey({})).toBeNull();
  });
});

describe('mergeVendorClients', () => {
  it('lists each person once, newest details first, gaps filled from older records', () => {
    const merged = mergeVendorClients([
      {
        client_name: 'Ann Lee',
        client_email: 'ann@example.com',
        client_phone: '',
        created_at: '2026-01-01',
      },
      {
        client_name: 'Ann M. Lee',
        client_email: 'ANN@example.com',
        client_phone: '601-555-0100',
        created_at: '2026-03-01',
      },
      {
        client_name: 'Bob',
        client_email: '',
        client_phone: '',
        created_at: '2026-02-01',
      },
    ]);
    expect(merged).toEqual([
      {
        key: 'e:ann@example.com',
        name: 'Ann M. Lee',
        email: 'ANN@example.com',
        phone: '601-555-0100',
        last_used: '2026-03-01',
      },
      {
        key: 'n:bob',
        name: 'Bob',
        email: '',
        phone: '',
        last_used: '2026-02-01',
      },
    ]);
  });

  it('sorts by name ignoring case and drops rows with nothing usable', () => {
    const merged = mergeVendorClients([
      { client_name: 'zed', client_email: 'z@x.co' },
      { client_name: 'Amy', client_email: 'a@x.co' },
      { client_name: '', client_email: '', client_phone: '12' },
    ]);
    expect(merged.map((c) => c.name)).toEqual(['Amy', 'zed']);
  });

  it('uses the email as the name when no name was saved', () => {
    expect(mergeVendorClients([{ client_email: 'solo@x.co' }])[0].name).toBe(
      'solo@x.co',
    );
  });
});

describe('VendorInvoicesService.listClients', () => {
  it("combines this vendor's records, skips cancelled and declined, and ignores other vendors", async () => {
    const db = new FakeDb({
      vendor_accounts: [{ id: 'v1', user_id: 'u1' }],
      vendor_bookings: [
        {
          vendor_account_id: 'v1',
          status: 'confirmed',
          client_name: 'Ann Lee',
          client_email: 'ann@example.com',
          client_phone: '6015550100',
          created_at: '2026-02-01',
        },
        {
          vendor_account_id: 'v1',
          status: 'cancelled',
          client_name: 'Cancelled Carl',
          client_email: 'carl@example.com',
          created_at: '2026-02-02',
        },
        {
          vendor_account_id: 'other',
          status: 'confirmed',
          client_name: 'Someone Else',
          client_email: 'else@example.com',
          created_at: '2026-02-03',
        },
      ],
      vendor_booking_requests: [
        {
          vendor_account_id: 'v1',
          status: 'pending',
          client_name: 'Request Rita',
          client_email: 'rita@example.com',
          client_phone: '',
          created_at: '2026-02-04',
        },
        {
          vendor_account_id: 'v1',
          status: 'declined',
          client_name: 'Declined Dan',
          client_email: 'dan@example.com',
          created_at: '2026-02-05',
        },
      ],
      vendor_invoices: [
        {
          vendor_account_id: 'v1',
          client_name: 'Ann Lee',
          client_email: 'ann@example.com',
          client_phone: '',
          created_at: '2026-03-01',
        },
      ],
      vendor_estimates: [
        {
          vendor_account_id: 'v1',
          client_name: 'Estimate Eve',
          client_email: 'eve@example.com',
          client_phone: '601-555-0199',
          created_at: '2026-03-02',
        },
      ],
    });
    const service = new VendorInvoicesService(
      { getAdminClient: () => db } as unknown as SupabaseService,
      {
        get: (key: string, fallback?: string) =>
          key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
      } as unknown as ConfigService,
      {} as unknown as SmsNotificationsService,
    );

    const clients = await service.listClients('u1');
    expect(clients.map((c) => c.name)).toEqual([
      'Ann Lee',
      'Estimate Eve',
      'Request Rita',
    ]);
    expect(clients[0]).toMatchObject({
      email: 'ann@example.com',
      phone: '6015550100',
    });
  });
});
