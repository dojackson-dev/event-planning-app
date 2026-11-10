import { BadRequestException } from '@nestjs/common';
import { sanitizePublicIntake } from './intake-forms.service';

const base = { event_date: '2026-12-01', contact_email: 'a@b.co' };

describe('sanitizePublicIntake', () => {
  it('keeps a normal submission unchanged', () => {
    const out = sanitizePublicIntake({
      ...base,
      guest_count: 50,
      contact_name: ' Ann ',
    });
    expect(out).toMatchObject({
      event_date: '2026-12-01',
      guest_count: 50,
      contact_name: 'Ann',
    });
  });

  it('truncates text to the column limits', () => {
    const out = sanitizePublicIntake({
      ...base,
      event_name: 'x'.repeat(400),
      contact_phone: '1'.repeat(80),
    });
    expect(out.event_name).toHaveLength(255);
    expect(out.contact_phone).toHaveLength(50);
  });

  it.each([
    '',
    '20256-01-01',
    '0026-05-01',
    '2026-02-30',
    'tomorrow',
    undefined,
  ])('rejects the event date %p', (date) => {
    expect(() => sanitizePublicIntake({ ...base, event_date: date })).toThrow(
      BadRequestException,
    );
  });

  it('clamps or clears an impossible guest count', () => {
    expect(
      sanitizePublicIntake({ ...base, guest_count: 5_000_000_000 }).guest_count,
    ).toBe(1_000_000);
    expect(
      sanitizePublicIntake({ ...base, guest_count: null }).guest_count,
    ).toBeNull();
    expect(
      sanitizePublicIntake({ ...base, guest_count: -4 }).guest_count,
    ).toBeNull();
  });

  it('rejects an email longer than the column', () => {
    expect(() =>
      sanitizePublicIntake({
        ...base,
        contact_email: 'a'.repeat(300) + '@b.co',
      }),
    ).toThrow(BadRequestException);
  });
});
