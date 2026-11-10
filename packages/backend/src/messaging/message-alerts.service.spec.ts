import { ConfigService } from '@nestjs/config';
import { MessageAlertsService } from './message-alerts.service';

const OWNER = '6e7b0130-9c1d-4a1a-bb02-723a4c67557c';

function setup(owner: Record<string, any> | null) {
  const db = {
    from: () => {
      const q: any = {};
      q.select = () => q;
      q.eq = () => q;
      q.maybeSingle = () => Promise.resolve({ data: owner, error: null });
      return q;
    },
  };
  const mail = { sendMessageAlert: jest.fn().mockResolvedValue(true) };
  const sms = { sendOne: jest.fn().mockResolvedValue(true) };
  const config = {
    get: (k: string) =>
      k === 'FRONTEND_URL' ? 'https://www.eventecos.com/' : undefined,
  } as unknown as ConfigService;
  const service = new MessageAlertsService(
    { getAdminClient: () => db } as any,
    mail as any,
    sms as any,
    config,
  );
  return { service, mail, sms };
}

const owner = {
  email: 'events@therookeryms.com',
  first_name: 'Dee',
  phone_number: '(601) 555-3001',
  sms_opt_in: true,
};

const base = {
  ownerId: OWNER,
  fromName: 'Shelton Chamber',
  text: 'Yes! See you then',
  channel: 'text' as const,
  alreadyAlerted: false,
};

describe('MessageAlertsService', () => {
  it('emails and texts the owner, with a link to the conversation', async () => {
    const { service, mail, sms } = setup(owner);
    await service.notifyOwner(base);

    expect(mail.sendMessageAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'events@therookeryms.com',
        ownerName: 'Dee',
        fromName: 'Shelton Chamber',
        channel: 'text',
        preview: 'Yes! See you then',
        link: 'https://www.eventecos.com/dashboard/messages',
      }),
    );
    expect(sms.sendOne).toHaveBeenCalledTimes(1);
    const [to, body] = sms.sendOne.mock.calls[0];
    expect(to).toBe('+16015553001');
    expect(body).toContain('Shelton Chamber texted you');
    expect(body).toContain('Yes! See you then');
    expect(body).toContain('https://www.eventecos.com/dashboard/messages');
  });

  it('says what a client-portal message is about', async () => {
    const { service, sms } = setup(owner);
    await service.notifyOwner({
      ...base,
      channel: 'chat',
      eventName: 'POSM Christmas Party',
    });
    expect(sms.sendOne.mock.calls[0][1]).toContain(
      'messaged you about POSM Christmas Party',
    );
  });

  it('stays quiet when the owner was already alerted about this conversation', async () => {
    const { service, mail, sms } = setup(owner);
    await service.notifyOwner({ ...base, alreadyAlerted: true });
    expect(mail.sendMessageAlert).not.toHaveBeenCalled();
    expect(sms.sendOne).not.toHaveBeenCalled();
  });

  it('does not text an owner who opted out of texts, or has no phone, but still emails', async () => {
    for (const patch of [{ sms_opt_in: false }, { phone_number: null }]) {
      const { service, mail, sms } = setup({ ...owner, ...patch });
      await service.notifyOwner(base);
      expect(sms.sendOne).not.toHaveBeenCalled();
      expect(mail.sendMessageAlert).toHaveBeenCalledTimes(1);
    }
  });

  it('texts but does not email an owner with no email address', async () => {
    const { service, mail, sms } = setup({ ...owner, email: null });
    await service.notifyOwner(base);
    expect(mail.sendMessageAlert).not.toHaveBeenCalled();
    expect(sms.sendOne).toHaveBeenCalledTimes(1);
  });

  it('does not alert the owner about a message from their own phone', async () => {
    const { service, mail, sms } = setup(owner);
    await service.notifyOwner({ ...base, fromPhone: '+16015553001' });
    expect(mail.sendMessageAlert).not.toHaveBeenCalled();
    expect(sms.sendOne).not.toHaveBeenCalled();
  });

  it('shortens a long message in the text alert', async () => {
    const { service, sms } = setup(owner);
    await service.notifyOwner({ ...base, text: 'word '.repeat(100) });
    expect(sms.sendOne.mock.calls[0][1].length).toBeLessThan(260);
    expect(sms.sendOne.mock.calls[0][1]).toContain('…');
  });

  it('never throws when sending fails, so the message itself is not lost', async () => {
    const { service, mail, sms } = setup(owner);
    mail.sendMessageAlert.mockRejectedValue(new Error('resend down'));
    sms.sendOne.mockRejectedValue(new Error('twilio down'));
    await expect(service.notifyOwner(base)).resolves.toBeUndefined();
  });

  it('does nothing when the owner cannot be found', async () => {
    const { service, mail, sms } = setup(null);
    await service.notifyOwner(base);
    expect(mail.sendMessageAlert).not.toHaveBeenCalled();
    expect(sms.sendOne).not.toHaveBeenCalled();
  });
});
