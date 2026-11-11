import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import {
  VendorProfileReminderService,
  isInternalEmail,
  missingBranding,
} from './vendor-profile-reminder.service';

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

const vendor = (over: Record<string, unknown>) => ({
  id: 'v?',
  business_name: 'Biz',
  email: 'biz@example.com',
  phone: '+16015550100',
  profile_image_url: null,
  cover_image_url: null,
  is_active: true,
  created_at: daysAgo(10),
  profile_reminder_sent_at: null,
  ...over,
});

function setup(vendors: Record<string, unknown>[], mail = true, sms = true) {
  const db = new FakeDb({ vendor_accounts: vendors });
  const mailService = {
    sendVendorProfileReminder: jest.fn().mockResolvedValue(mail),
  };
  // The real sender returns false when a vendor has no phone number.
  const smsService = {
    vendorProfileReminder: jest
      .fn()
      .mockImplementation((phone: string | null) =>
        Promise.resolve(!!phone && sms),
      ),
  };
  const service = new VendorProfileReminderService(
    { getAdminClient: () => db } as unknown as SupabaseService,
    mailService as unknown as MailService,
    smsService as unknown as SmsNotificationsService,
  );
  return { db, service, mailService, smsService };
}

describe('missingBranding', () => {
  it('lists what is missing', () => {
    expect(missingBranding({})).toEqual(['profile photo', 'banner']);
    expect(
      missingBranding({ profile_image_url: 'x', cover_image_url: ' ' }),
    ).toEqual(['banner']);
    expect(
      missingBranding({ profile_image_url: 'x', cover_image_url: 'y' }),
    ).toEqual([]);
  });
});

describe('isInternalEmail', () => {
  it.each([
    ['testing@eventecos.com', true],
    ['Sales@EventEcos.com', true],
    ['someone@gmail.com', false],
    ['not-an-email', false],
  ])('%s -> %s', (email, expected) => {
    expect(isInternalEmail(email)).toBe(expected);
  });
});

describe('VendorProfileReminderService', () => {
  const vendors = [
    vendor({ id: 'none', business_name: 'No Images' }),
    vendor({
      id: 'bannerless',
      business_name: 'Banner Missing',
      profile_image_url: 'p.png',
    }),
    vendor({
      id: 'complete',
      profile_image_url: 'p.png',
      cover_image_url: 'c.png',
    }),
    vendor({ id: 'internal', email: 'testing@eventecos.com' }),
    vendor({ id: 'no-email', email: '' }),
    vendor({ id: 'inactive', is_active: false }),
    vendor({ id: 'already', profile_reminder_sent_at: daysAgo(1) }),
    vendor({ id: 'new', created_at: daysAgo(1) }),
    vendor({ id: 'no-phone', phone: null }),
  ];

  it('finds only vendors that are missing an image and should be asked', async () => {
    const { service } = setup(vendors);
    const ids = (await service.findEligible(3)).map((v) => v.id).sort();
    expect(ids).toEqual(['bannerless', 'no-phone', 'none']);
  });

  it('includes brand-new vendors when the minimum age is zero', async () => {
    const { service } = setup(vendors);
    const ids = (await service.findEligible(0)).map((v) => v.id);
    expect(ids).toContain('new');
  });

  it('a dry run lists recipients and sends nothing', async () => {
    const { service, mailService, smsService, db } = setup(vendors);
    const result = await service.run({ dryRun: true });
    expect(result.eligible).toHaveLength(3);
    expect(mailService.sendVendorProfileReminder).not.toHaveBeenCalled();
    expect(smsService.vendorProfileReminder).not.toHaveBeenCalled();
    expect(
      db.rows('vendor_accounts').filter((v) => v.id === 'none')[0]
        .profile_reminder_sent_at,
    ).toBeNull();
  });

  it('emails and texts each vendor once, naming what is missing, and stamps them', async () => {
    const { service, mailService, smsService, db } = setup(vendors);
    const result = await service.run();

    expect(result).toMatchObject({ emailed: 3, texted: 2 });
    expect(mailService.sendVendorProfileReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'biz@example.com',
        businessName: 'Banner Missing',
        missing: ['banner'],
        link: expect.stringContaining('/vendors/dashboard/profile'),
      }),
    );
    expect(smsService.vendorProfileReminder).toHaveBeenCalledTimes(3);
    expect(
      db.rows('vendor_accounts').find((v) => v.id === 'none')
        ?.profile_reminder_sent_at,
    ).toBeTruthy();

    // A second run finds nobody left.
    mailService.sendVendorProfileReminder.mockClear();
    const again = await service.run();
    expect(again.eligible).toHaveLength(0);
    expect(mailService.sendVendorProfileReminder).not.toHaveBeenCalled();
  });

  it('does not double-send when another run already claimed the vendor', async () => {
    const { service, mailService, db } = setup([vendor({ id: 'race' })]);
    const eligible = await service.findEligible(3);
    // Another run stamps the vendor between the lookup and the send.
    db.rows('vendor_accounts')[0].profile_reminder_sent_at =
      new Date().toISOString();
    jest.spyOn(service, 'findEligible').mockResolvedValue(eligible);
    await service.run();
    expect(mailService.sendVendorProfileReminder).not.toHaveBeenCalled();
  });

  it('lets the next run retry when nothing could be delivered', async () => {
    const { service, db } = setup([vendor({ id: 'bounce' })], false, false);
    const result = await service.run();
    expect(result).toMatchObject({ emailed: 0, texted: 0 });
    expect(db.rows('vendor_accounts')[0].profile_reminder_sent_at).toBeNull();
  });

  it('keeps the stamp when only the text fails', async () => {
    const { service, db } = setup([vendor({ id: 'half' })], true, false);
    const result = await service.run();
    expect(result).toMatchObject({ emailed: 1, texted: 0 });
    expect(db.rows('vendor_accounts')[0].profile_reminder_sent_at).toBeTruthy();
  });

  it('respects the per-run limit', async () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      vendor({ id: `m${i}`, email: `m${i}@example.com` }),
    );
    const { service, mailService } = setup(many);
    await service.run({ limit: 2 });
    expect(mailService.sendVendorProfileReminder).toHaveBeenCalledTimes(2);
  });

  it('does nothing in the daily job when switched off', async () => {
    const { service, mailService } = setup([vendor({ id: 'x' })]);
    process.env.VENDOR_PROFILE_REMINDERS = 'off';
    try {
      await service.sendDaily();
    } finally {
      delete process.env.VENDOR_PROFILE_REMINDERS;
    }
    expect(mailService.sendVendorProfileReminder).not.toHaveBeenCalled();
  });

  it('runs in the daily job by default', async () => {
    const { service, mailService } = setup([vendor({ id: 'x' })]);
    await service.sendDaily();
    expect(mailService.sendVendorProfileReminder).toHaveBeenCalledTimes(1);
  });
});
