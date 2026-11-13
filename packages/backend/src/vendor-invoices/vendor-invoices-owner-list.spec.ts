import { ConfigService } from '@nestjs/config';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { FakeDb } from './test-support/fake-db';

const ACCOUNT = 'owner-acct';

function setup() {
  const db = new FakeDb({
    owner_accounts: [{ id: ACCOUNT, primary_owner_id: 'owner-user' }],
    users: [
      {
        id: 'owner-user',
        email: 'Events@therookeryms.com',
        phone_number: '+16017083001',
      },
    ],
    vendor_bookings: [],
    vendor_accounts: [{ id: 'v1', business_name: 'Pat’s Photography' }],
    vendor_invoices: [
      {
        id: 'booking-inv',
        invoice_type: 'owner_booking',
        owner_account_id: ACCOUNT,
        status: 'viewed',
        created_at: '2026-10-26',
      },
      {
        id: 'by-email',
        invoice_type: 'client',
        status: 'sent',
        client_email: 'events@therookeryms.com',
        client_phone: null,
        created_at: '2026-11-08',
      },
      {
        id: 'by-phone-typo-email',
        invoice_type: 'client',
        status: 'viewed',
        client_email: 'event@therookery.com',
        client_phone: '6017083001',
        created_at: '2026-11-07',
      },
      {
        id: 'by-phone-plus1',
        invoice_type: 'client',
        status: 'processing',
        client_email: null,
        client_phone: '+16017083001',
        created_at: '2026-11-06',
      },
      {
        id: 'both',
        invoice_type: 'client',
        status: 'paid',
        client_email: 'EVENTS@therookeryms.com',
        client_phone: '6017083001',
        created_at: '2026-11-05',
      },
      {
        id: 'draft',
        invoice_type: 'client',
        status: 'draft',
        client_email: 'events@therookeryms.com',
        created_at: '2026-11-09',
      },
      {
        id: 'someone-else',
        invoice_type: 'client',
        status: 'sent',
        client_email: 'other@example.com',
        client_phone: '6015550000',
        created_at: '2026-11-09',
      },
      {
        id: 'other-owner-booking',
        invoice_type: 'owner_booking',
        owner_account_id: 'different',
        status: 'sent',
        created_at: '2026-11-09',
      },
    ],
  });
  return new VendorInvoicesService(
    { getAdminClient: () => db } as unknown as SupabaseService,
    {
      get: (key: string, fallback?: string) =>
        key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
    } as unknown as ConfigService,
    {} as unknown as SmsNotificationsService,
  );
}

describe("the owner's vendor invoices", () => {
  it('include invoices a vendor addressed to the owner by email or phone, newest first, without duplicates', async () => {
    const list = await setup().listOwnerBookingInvoices(ACCOUNT, 'owner-user');
    expect(list.map((i: any) => i.id)).toEqual([
      'by-email',
      'by-phone-typo-email',
      'by-phone-plus1',
      'both',
      'booking-inv',
    ]);
  });

  it("leave out drafts, other people's invoices and other owners' booking invoices", async () => {
    const ids = (
      await setup().listOwnerBookingInvoices(ACCOUNT, 'owner-user')
    ).map((i: any) => i.id);
    for (const hidden of ['draft', 'someone-else', 'other-owner-booking'])
      expect(ids).not.toContain(hidden);
  });

  it('show only the booking invoices when the owner has no email or phone on file', async () => {
    const service = setup();
    const db = (service as any).supabaseService.getAdminClient() as FakeDb;
    db.rows('users')[0].email = '';
    db.rows('users')[0].phone_number = null;
    const ids = (
      await service.listOwnerBookingInvoices(ACCOUNT, 'owner-user')
    ).map((i: any) => i.id);
    expect(ids).toEqual(['booking-inv']);
  });
});
