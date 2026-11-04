import { BadRequestException } from '@nestjs/common';
import {
  buildSmsBody,
  cleanMessage,
  GUEST_MESSAGE_MAX_LENGTH,
  mapWithConcurrency,
  parseAudience,
  planRecipients,
  MessageGuest,
} from './guest-message';

const guest = (over: Partial<MessageGuest> & { id: string }): MessageGuest => ({
  guest_name: `Guest ${over.id}`,
  guest_phone: null,
  guest_email: null,
  status: 'attending',
  sms_sent_at: '2026-11-01T00:00:00Z',
  responded_at: '2026-11-02T00:00:00Z',
  ...over,
});

describe('parseAudience', () => {
  it('accepts the four groups and rejects anything else', () => {
    for (const a of ['attending', 'pending', 'declined', 'all']) {
      expect(parseAudience(a)).toBe(a);
    }
    expect(() => parseAudience('everyone')).toThrow(BadRequestException);
    expect(() => parseAudience(undefined)).toThrow(BadRequestException);
  });
});

describe('cleanMessage', () => {
  it('trims and keeps normal text and line breaks', () => {
    expect(cleanMessage('  Doors open at 6!\nSee you there.  ')).toBe(
      'Doors open at 6!\nSee you there.',
    );
  });

  it('removes control characters and collapses blank lines', () => {
    expect(cleanMessage('Hi\u0000 there\n\n\n\nBye')).toBe('Hi there\n\nBye');
  });

  it('rejects an empty or non-text message', () => {
    expect(() => cleanMessage('   ')).toThrow(BadRequestException);
    expect(() => cleanMessage(undefined)).toThrow(BadRequestException);
  });

  it('enforces the length limit', () => {
    expect(() =>
      cleanMessage('x'.repeat(GUEST_MESSAGE_MAX_LENGTH)),
    ).not.toThrow();
    expect(() =>
      cleanMessage('x'.repeat(GUEST_MESSAGE_MAX_LENGTH + 1)),
    ).toThrow(/320 characters/);
  });
});

describe('planRecipients', () => {
  const guests = [
    guest({ id: '1', guest_phone: '(404) 555-0101', guest_email: 'a@x.com' }),
    guest({ id: '2', status: 'declined', guest_phone: '404-555-0102' }),
    guest({
      id: '3',
      status: 'pending',
      sms_sent_at: '2026-11-01T00:00:00Z',
      responded_at: null,
      guest_email: 'c@x.com',
    }),
    guest({ id: '4', guest_name: 'No contact' }),
  ];

  it('picks only the chosen group', () => {
    const plan = planRecipients(guests, 'attending');
    expect(plan.recipients.map((r) => r.guest.id)).toEqual(['1']);
    expect(plan.skipped).toBe(1);
  });

  it('counts texts and emails per channel', () => {
    const plan = planRecipients(guests, 'all');
    expect(plan.recipients.map((r) => r.guest.id)).toEqual(['1', '2', '3']);
    expect(plan.smsCount).toBe(2);
    expect(plan.emailCount).toBe(2);
  });

  it('never messages someone who was not invited and has not answered', () => {
    const plan = planRecipients(
      [
        guest({
          id: '9',
          guest_phone: '404-555-0109',
          sms_sent_at: null,
          responded_at: null,
        }),
      ],
      'all',
    );
    expect(plan.recipients).toHaveLength(0);
    expect(plan.skipped).toBe(1);
  });

  it('texts a shared phone once but still emails each person', () => {
    const plan = planRecipients(
      [
        guest({ id: 'a', guest_phone: '404-555-0111', guest_email: 'a@x.com' }),
        guest({
          id: 'b',
          guest_phone: '(404) 555-0111',
          guest_email: 'b@x.com',
        }),
      ],
      'attending',
    );
    expect(plan.recipients.map((r) => [r.guest.id, r.sms, r.email])).toEqual([
      ['a', true, true],
      ['b', false, true],
    ]);
  });

  it('drops a guest whose only contact is already covered', () => {
    const plan = planRecipients(
      [
        guest({ id: 'a', guest_phone: '404-555-0111' }),
        guest({ id: 'b', guest_phone: '404-555-0111' }),
      ],
      'attending',
    );
    expect(plan.recipients.map((r) => r.guest.id)).toEqual(['a']);
    expect(plan.skipped).toBe(1);
  });
});

describe('buildSmsBody', () => {
  it('names who it is from and which event', () => {
    expect(buildSmsBody('Dee', 'Gala', 'Parking is free.')).toBe(
      'Dee about Gala: Parking is free.',
    );
  });
});

describe('mapWithConcurrency', () => {
  it('returns results in order and never exceeds the limit', async () => {
    let active = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
