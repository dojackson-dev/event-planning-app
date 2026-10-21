import { BadRequestException, NotFoundException } from '@nestjs/common';
import { parseUuidParam } from './common';
import {
  normalizeEmail,
  normalizePhone,
  parseCode,
  parseRegisterStart,
  parseVerify,
} from './register.dto';

describe('registration DTO parsing', () => {
  const valid = {
    fullName: '  Pat   Donor ',
    email: ' Pat@Example.COM ',
    phone: '(415) 555-0123',
    acceptTerms: true,
    smsConsent: false,
  };

  it('normalizes a valid registration', () => {
    expect(parseRegisterStart(valid)).toEqual({
      fullName: 'Pat Donor',
      email: 'pat@example.com',
      phone: '+14155550123',
      acceptTerms: true,
      smsConsent: false,
    });
  });

  it('requires acceptTerms to be exactly true and smsConsent to be a boolean', () => {
    expect(() => parseRegisterStart({ ...valid, acceptTerms: false })).toThrow(
      BadRequestException,
    );
    expect(() => parseRegisterStart({ ...valid, acceptTerms: 'true' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseRegisterStart({ ...valid, smsConsent: undefined }),
    ).toThrow(BadRequestException);
    expect(() => parseRegisterStart(null)).toThrow(BadRequestException);
  });

  it('rejects empty, overlong and control-character names', () => {
    for (const fullName of ['', '   ', 'x'.repeat(81), 'Pat\u0000Donor', 5]) {
      expect(() => parseRegisterStart({ ...valid, fullName })).toThrow(
        BadRequestException,
      );
    }
  });

  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail('  A@B.Co ')).toBe('a@b.co');
    });
    it.each([
      '',
      'nope',
      'a@b',
      'a b@c.co',
      '@c.co',
      5,
      'x'.repeat(250) + '@b.co',
    ])('rejects %p', (bad) => {
      expect(() => normalizeEmail(bad)).toThrow(BadRequestException);
    });
  });

  describe('normalizePhone', () => {
    it.each([
      ['4155550123', '+14155550123'],
      ['415-555-0123', '+14155550123'],
      ['(415) 555 0123', '+14155550123'],
      ['1 415 555 0123', '+14155550123'],
      ['+1 (415) 555-0123', '+14155550123'],
      ['+442071838750', '+442071838750'],
    ])('normalizes %s to %s', (input, expected) => {
      expect(normalizePhone(input)).toBe(expected);
    });

    it.each([
      '',
      '12345',
      '0155550123',
      '1115550123',
      '4151550123',
      '+1111111111',
      '+11234567890',
      '+0123456789',
      '+1234',
      '+4444444444444',
      'abcdefghij',
      '415555012345678',
      5,
    ])('rejects %p', (bad) => {
      expect(() => normalizePhone(bad)).toThrow(BadRequestException);
    });
  });

  it('parses verify bodies', () => {
    expect(
      parseVerify({ email: 'A@b.co', channel: 'sms', code: ' 123456 ' }),
    ).toEqual({ email: 'a@b.co', channel: 'sms', code: '123456' });
    expect(() =>
      parseVerify({ email: 'a@b.co', channel: 'voice', code: '123456' }),
    ).toThrow(BadRequestException);
    expect(() => parseCode('12345')).toThrow(BadRequestException);
    expect(() => parseCode('abcdef')).toThrow(BadRequestException);
    expect(() => parseCode(123456)).toThrow(BadRequestException);
  });

  it('answers 404 for malformed ids', () => {
    expect(() => parseUuidParam('not-a-uuid')).toThrow(NotFoundException);
    expect(() => parseUuidParam("1' OR '1'='1")).toThrow(NotFoundException);
    expect(parseUuidParam('11111111-1111-4111-8111-111111111111')).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
  });
});
