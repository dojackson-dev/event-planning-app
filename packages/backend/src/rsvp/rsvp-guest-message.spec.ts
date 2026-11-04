import { BadRequestException, HttpException } from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { MessageGuest } from './guest-message';

const guest = (over: Partial<MessageGuest> & { id: string }): MessageGuest => ({
  guest_name: `Guest ${over.id}`,
  guest_phone: null,
  guest_email: null,
  status: 'attending',
  sms_sent_at: '2026-11-01T00:00:00Z',
  responded_at: '2026-11-02T00:00:00Z',
  ...over,
});

function setup(opts: {
  guests: MessageGuest[];
  broadcastsToday?: number;
  broadcastCountError?: boolean;
  smsOk?: boolean;
  emailOk?: boolean;
}) {
  const inserted: any[] = [];
  const admin = {
    from: jest.fn((table: string) => {
      const q: any = {};
      for (const m of ['select', 'eq', 'gte', 'order']) q[m] = jest.fn(() => q);
      if (table === 'rsvp_broadcasts') {
        q.then = (resolve: any) =>
          resolve(
            opts.broadcastCountError
              ? { count: null, error: { message: 'no table' } }
              : { count: opts.broadcastsToday ?? 0, error: null },
          );
        q.insert = jest.fn((row: any) => {
          inserted.push(row);
          return Promise.resolve({ error: null });
        });
      } else if (table === 'owner_accounts') {
        q.maybeSingle = jest.fn(() =>
          Promise.resolve({ data: { business_name: 'The Rookery' } }),
        );
      }
      return q;
    }),
  };
  const sms = {
    sendOne: jest.fn().mockResolvedValue(opts.smsOk ?? true),
    trySend: jest.fn(),
  };
  const mail = {
    sendGuestMessage: jest.fn().mockResolvedValue(opts.emailOk ?? true),
  };
  const service = new RsvpService(
    { getAdminClient: () => admin } as any,
    sms as any,
    mail as any,
    {} as any,
  );
  (service as any).verifyClientOwnsForm = jest.fn().mockResolvedValue({
    id: 'form1',
    contact_name: 'Dee Nixon',
    contact_email: 'dee@example.com',
  });
  (service as any).findEventForForm = jest
    .fn()
    .mockResolvedValue({ name: 'Spring Gala', date: '2027-03-20' });
  (service as any).loadMessageGuests = jest.fn().mockResolvedValue(opts.guests);
  return { service, sms, mail, inserted };
}

const twoGuests = [
  guest({ id: '1', guest_phone: '404-555-0101', guest_email: 'a@x.com' }),
  guest({ id: '2', guest_phone: '404-555-0102' }),
  guest({ id: '3', status: 'declined', guest_email: 'c@x.com' }),
];

describe('RsvpService.sendGuestMessage', () => {
  it('texts and emails the chosen group and logs the broadcast', async () => {
    const { service, sms, mail, inserted } = setup({ guests: twoGuests });
    const result = await service.sendGuestMessage('form1', '4045550000', {
      audience: 'attending',
      message: 'Doors open at 6!',
    });
    expect(result).toMatchObject({
      recipients: 2,
      smsSent: 2,
      emailSent: 1,
      reached: 2,
      failed: 0,
    });
    expect(sms.sendOne).toHaveBeenCalledTimes(2);
    expect(sms.sendOne.mock.calls[0][1]).toBe(
      'Dee Nixon about Spring Gala: Doors open at 6!',
    );
    expect(mail.sendGuestMessage).toHaveBeenCalledTimes(1);
    expect(mail.sendGuestMessage.mock.calls[0][0]).toMatchObject({
      toEmail: 'a@x.com',
      senderName: 'Dee Nixon',
      replyTo: 'dee@example.com',
      eventName: 'Spring Gala',
    });
    expect(inserted[0]).toMatchObject({
      intake_form_id: 'form1',
      audience: 'attending',
      recipients: 2,
      sent_by: 'client:4045550000',
    });
  });

  it('a venue owner sends as the venue, with no reply-to', async () => {
    const { service, sms, mail } = setup({ guests: twoGuests });
    await service.sendGuestMessage(
      'form1',
      { ownerId: 'o1' },
      {
        audience: 'attending',
        message: 'Hello',
      },
    );
    expect(sms.sendOne.mock.calls[0][1]).toBe(
      'The Rookery about Spring Gala: Hello',
    );
    expect(mail.sendGuestMessage.mock.calls[0][0].replyTo).toBeNull();
  });

  it('counts guests it could not reach as failed and keeps going', async () => {
    const { service } = setup({
      guests: twoGuests,
      smsOk: false,
      emailOk: false,
    });
    const out = await service.sendGuestMessage('form1', '4045550000', {
      audience: 'attending',
      message: 'Hi',
    });
    expect(out).toMatchObject({ recipients: 2, reached: 0, failed: 2 });
  });

  it('stops at the daily limit with a 429', async () => {
    const { service, sms } = setup({ guests: twoGuests, broadcastsToday: 3 });
    await expect(
      service.sendGuestMessage('form1', '4045550000', {
        audience: 'attending',
        message: 'Hi',
      }),
    ).rejects.toMatchObject({ status: 429 });
    expect(sms.sendOne).not.toHaveBeenCalled();
  });

  it('still sends when the log table is missing', async () => {
    const { service } = setup({ guests: twoGuests, broadcastCountError: true });
    await expect(
      service.sendGuestMessage('form1', '4045550000', {
        audience: 'attending',
        message: 'Hi',
      }),
    ).resolves.toMatchObject({ recipients: 2 });
  });

  it('refuses an empty group, a bad group and a bad message without sending', async () => {
    const { service, sms } = setup({ guests: twoGuests });
    await expect(
      service.sendGuestMessage('form1', '4045550000', {
        audience: 'pending',
        message: 'Hi',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendGuestMessage('form1', '4045550000', {
        audience: 'nope',
        message: 'Hi',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendGuestMessage('form1', '4045550000', {
        audience: 'all',
        message: '  ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sms.sendOne).not.toHaveBeenCalled();
  });

  it('refuses more than the per-message limit', async () => {
    const many = Array.from({ length: 301 }, (_, i) =>
      guest({ id: String(i), guest_phone: `404-555-${String(1000 + i)}` }),
    );
    const { service, sms } = setup({ guests: many });
    await expect(
      service.sendGuestMessage('form1', '4045550000', {
        audience: 'all',
        message: 'Hi',
      }),
    ).rejects.toThrow(/limited to 300/);
    expect(sms.sendOne).not.toHaveBeenCalled();
  });
});

describe('RsvpService.previewGuestMessage', () => {
  it('reports how many people and by which channel', async () => {
    const { service } = setup({ guests: twoGuests });
    await expect(
      service.previewGuestMessage('form1', '4045550000', 'all'),
    ).resolves.toMatchObject({ recipients: 3, sms: 2, email: 2 });
  });
});

it('HttpException is used for the rate limit', () => {
  expect(new HttpException('x', 429).getStatus()).toBe(429);
});
