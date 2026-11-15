import { BadRequestException } from '@nestjs/common';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import { PromoterEventsService } from './promoter-events.service';

const TICKET = {
  id: 't1',
  status: 'valid',
  public_event_id: 'e1',
  buyer_email: null,
  buyer_phone: '+16015550100',
  public_events: { title: 'Folk Festival', event_date: '2026-12-01' },
};

function setup() {
  const db = new FakeDb({
    tickets: [{ ...TICKET }],
    ticket_forward_codes: [],
    ticket_tiers: [{ id: 'tier1', name: 'GA', public_event_id: 'e1' }],
    public_events: [
      {
        id: 'e1',
        title: 'Folk Festival',
        event_date: '2026-12-01',
        promoter_account_id: 'p1',
      },
    ],
  });
  const sms = { sendOne: jest.fn().mockResolvedValue(true) };
  const service = new PromoterEventsService(
    { getAdminClient: () => db } as any,
    {
      get: (k: string) =>
        k === 'FRONTEND_URL' ? 'https://www.eventecos.com' : 'sk_test_dummy',
    } as any,
    {} as any,
    sms as any,
  );
  (service as any).getPromoterAccount = () => Promise.resolve({ id: 'p1' });
  return { db, sms, service };
}

describe('forwarding a ticket needs only a phone number', () => {
  it('creates the access code and texts the recipient a link', async () => {
    const { db, sms, service } = setup();
    const result = await service.forwardTicket('t1', '(601) 555-0123');
    expect(result.sms_sent).toBe(true);
    expect(result.code).toBe(result.forwardCode);
    expect(db.rows('ticket_forward_codes')).toMatchObject([
      { ticket_id: 't1', recipient_phone: '+16015550123', code: result.code },
    ]);
    const [to, body] = sms.sendOne.mock.calls[0];
    expect(to).toBe('+16015550123');
    expect(body).toContain('Folk Festival');
    expect(body).toContain(
      `https://www.eventecos.com/tickets/forward/${result.code}`,
    );
  });

  it('still returns the code when the text could not be sent', async () => {
    const { sms, service } = setup();
    sms.sendOne.mockResolvedValue(false);
    const result = await service.forwardTicket('t1', '6015550123');
    expect(result.sms_sent).toBe(false);
    expect(result.code).toBeTruthy();
  });

  it('rejects a missing or invalid phone number, and never asks for an email', async () => {
    const { sms, service } = setup();
    await expect(service.forwardTicket('t1', undefined)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.forwardTicket('t1', '12345')).rejects.toThrow(
      'valid mobile phone number',
    );
    expect(sms.sendOne).not.toHaveBeenCalled();
  });
});

describe('comp tickets need only a phone number', () => {
  it('creates the ticket without an email and texts the ticket link', async () => {
    const { db, sms, service } = setup();
    const result = await service.sendCompTicket(
      'u1',
      'e1',
      'tier1',
      '601-555-0188',
      'Jane Doe',
    );
    expect(result.sms_sent).toBe(true);
    const created = db.rows('tickets').find((t) => t.is_comp);
    expect(created).toMatchObject({
      buyer_phone: '+16015550188',
      buyer_name: 'Jane Doe',
      status: 'valid',
      amount_paid: 0,
    });
    expect(created).not.toHaveProperty('buyer_email');
    const [to, body] = sms.sendOne.mock.calls[0];
    expect(to).toBe('+16015550188');
    expect(body).toContain(`https://www.eventecos.com/ticket/${created!.id}`);
  });

  it('refuses without a valid phone number and creates nothing', async () => {
    const { db, service } = setup();
    await expect(
      service.sendCompTicket('u1', 'e1', 'tier1', ''),
    ).rejects.toThrow('valid mobile phone number');
    expect(db.rows('tickets').filter((t) => t.is_comp)).toHaveLength(0);
  });
});

describe('resending a ticket to a phone-only holder', () => {
  it('texts the ticket link', async () => {
    const { sms, service } = setup();
    await service.resendTicketConfirmation('u1', 'e1', 't1');
    const [to, body] = sms.sendOne.mock.calls[0];
    expect(to).toBe('+16015550100');
    expect(body).toContain('https://www.eventecos.com/ticket/t1');
  });
});
