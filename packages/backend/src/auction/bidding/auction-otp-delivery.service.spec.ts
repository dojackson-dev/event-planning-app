import { Logger } from '@nestjs/common';
import type { TwilioService } from '../../messaging/twilio.service';
import { AuctionOtpDelivery, escapeHtml } from './auction-otp-delivery.service';

const send = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}));

describe('AuctionOtpDelivery', () => {
  const env = { ...process.env };
  const twilio = { sendSMS: jest.fn() };
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  const delivery = () =>
    new AuctionOtpDelivery(twilio as unknown as TwilioService);
  const ctx = {
    bidderId: 'b-1',
    auctionTitle: 'Gala <script>alert(1)</script>',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it('escapes interpolated html', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });

  it('sends email through Resend with the default sender and an escaped title', async () => {
    process.env.RESEND_API_KEY = 're_test';
    send.mockResolvedValue({ data: { id: '1' }, error: null });
    await expect(
      delivery().send('email', 'pat@example.com', '123456', ctx),
    ).resolves.toBe(true);
    const arg = send.mock.calls[0][0];
    expect(arg.from).toBe('EventEcos <noreply@eventecos.com>');
    expect(arg.to).toEqual(['pat@example.com']);
    expect(arg.html).toContain('123456');
    expect(arg.html).not.toContain('<script>');
    expect(arg.html).toContain('&lt;script&gt;');
  });

  it('uses RESEND_FROM when set', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM = 'Gala <gala@example.org>';
    send.mockResolvedValue({ data: {}, error: null });
    await delivery().send('email', 'pat@example.com', '123456', ctx);
    expect(send.mock.calls[0][0].from).toBe('Gala <gala@example.org>');
  });

  it('sends SMS through the Twilio service', async () => {
    twilio.sendSMS.mockResolvedValue({ sid: 's', status: 'queued' });
    await expect(
      delivery().send('sms', '+14155550123', '654321', ctx),
    ).resolves.toBe(true);
    expect(twilio.sendSMS).toHaveBeenCalledWith(
      '+14155550123',
      expect.stringContaining('654321'),
    );
  });

  it('returns false without throwing when delivery fails, and logs no contact details', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.NODE_ENV = 'test';
    send.mockRejectedValue(new Error('boom pat@example.com'));
    twilio.sendSMS.mockRejectedValue(new Error('bad number +14155550123'));
    const d = delivery();
    await expect(
      d.send('email', 'pat@example.com', '123456', ctx),
    ).resolves.toBe(false);
    await expect(d.send('sms', '+14155550123', '123456', ctx)).resolves.toBe(
      false,
    );
    const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    expect(logged).not.toContain('pat@example.com');
    expect(logged).not.toContain('+14155550123');
    expect(logged).not.toContain('123456');
  });

  it('treats a Resend error response as a failed delivery', async () => {
    process.env.RESEND_API_KEY = 're_test';
    send.mockResolvedValue({ data: null, error: { name: 'validation_error' } });
    await expect(
      delivery().send('email', 'pat@example.com', '123456', ctx),
    ).resolves.toBe(false);
  });

  describe('without provider keys', () => {
    it('does not print the code in test or production', async () => {
      for (const nodeEnv of ['test', 'production']) {
        process.env.NODE_ENV = nodeEnv;
        warn.mockClear();
        error.mockClear();
        await expect(
          delivery().send('email', 'pat@example.com', '123456', ctx),
        ).resolves.toBe(false);
        const logged = JSON.stringify([
          ...warn.mock.calls,
          ...error.mock.calls,
        ]);
        expect(logged).toContain('not delivered');
        expect(logged).not.toContain('123456');
        expect(logged).not.toContain('pat@example.com');
      }
      expect(error).toHaveBeenCalled();
    });

    it('prints the code only when NODE_ENV is development', async () => {
      process.env.NODE_ENV = 'development';
      await delivery().send('email', 'pat@example.com', '123456', ctx);
      const logged = JSON.stringify(warn.mock.calls);
      expect(logged).toContain('123456');
      expect(logged).not.toContain('pat@example.com');
    });
  });
});
