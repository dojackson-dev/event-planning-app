import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

function setup(sendMail = jest.fn().mockResolvedValue({ messageId: 'm1' })) {
  const service = Object.create(MailService.prototype) as MailService;
  Object.assign(service, {
    transporter: { sendMail },
    logger: new Logger('test'),
  });
  return { service, sendMail };
}

describe('MailService.sendClientPortalGuide', () => {
  const original = process.env.FRONTEND_URL;
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://eventecos.test';
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.env.FRONTEND_URL = original;
    jest.restoreAllMocks();
  });

  it('explains the five steps, vendors and RSVPs, and links to the portal login', async () => {
    const { service, sendMail } = setup();
    await expect(
      service.sendClientPortalGuide({
        clientName: 'Dee',
        clientEmail: 'dee@example.test',
        venueName: 'The Rookery MS',
      }),
    ).resolves.toBe(true);

    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('dee@example.test');
    expect(mail.subject).toBe('How to use your The Rookery MS client portal');
    for (const step of [
      'Activate',
      'Estimate',
      'Contract',
      'Invoice',
      'Booked',
    ]) {
      expect(mail.html).toContain(step);
      expect(mail.text).toContain(step);
    }
    expect(mail.html).toContain('Explore vendors');
    expect(mail.html).toContain('Collect RSVPs from your guests');
    expect(mail.html).toContain('Send All');
    expect(mail.html).toContain('href="https://eventecos.test/client-login"');
    expect(mail.text).toContain('https://eventecos.test/client-login');
  });

  it('escapes names so they cannot inject markup', async () => {
    const { service, sendMail } = setup();
    await service.sendClientPortalGuide({
      clientName: '<script>alert(1)</script>',
      clientEmail: 'x@example.test',
      venueName: '<b>Venue</b>',
    });
    const mail = sendMail.mock.calls[0][0];
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).not.toContain('<b>Venue</b>');
  });

  it('falls back to a generic sender name when no venue is known', async () => {
    const { service, sendMail } = setup();
    await service.sendClientPortalGuide({
      clientName: 'Dee',
      clientEmail: 'dee@example.test',
    });
    expect(sendMail.mock.calls[0][0].subject).toBe(
      'How to use your client portal',
    );
  });

  it('reports false, and does not throw, when the mail server fails', async () => {
    const { service } = setup(
      jest.fn().mockRejectedValue(new Error('smtp down')),
    );
    await expect(
      service.sendClientPortalGuide({
        clientName: 'Dee',
        clientEmail: 'dee@example.test',
      }),
    ).resolves.toBe(false);
  });
});
