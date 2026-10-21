import { BadRequestException } from '@nestjs/common';
import { AUCTION_OTP_CHANNELS } from '../../auction.types';
import type { AuctionOtpChannel } from '../../auction.types';
import { asBody } from './common';

/** Version of the card-on-file authorization / SMS terms text shown at registration. */
export const AUCTION_TERMS_VERSION = 'v1';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) < 32) return true;
  }
  return false;
}

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Enter a valid email address.');
  }
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw new BadRequestException('Enter a valid email address.');
  }
  return email;
}

/** E.164; bare 10-digit (or 1 + 10-digit) numbers are treated as US/Canada. */
export function normalizePhone(value: unknown): string {
  const bad = () =>
    new BadRequestException('Enter a valid mobile phone number.');
  if (typeof value !== 'string' || value.length > 40) throw bad();
  const trimmed = value.trim();
  const digits = trimmed.replace(/[\s().-]/g, '');
  let e164: string;
  if (digits.startsWith('+')) {
    e164 = digits;
  } else if (/^[2-9]\d{9}$/.test(digits)) {
    e164 = `+1${digits}`;
  } else if (/^1[2-9]\d{9}$/.test(digits)) {
    e164 = `+${digits}`;
  } else {
    throw bad();
  }
  if (!/^\+[1-9]\d{6,14}$/.test(e164)) throw bad();
  // Format-only junk filters: NANP shape and all-identical digits.
  if (e164.startsWith('+1') && !/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(e164)) {
    throw bad();
  }
  if (/^\+(\d)\1+$/.test(e164)) throw bad();
  return e164;
}

export function parseChannel(value: unknown): AuctionOtpChannel {
  if (
    typeof value !== 'string' ||
    !(AUCTION_OTP_CHANNELS as readonly string[]).includes(value)
  ) {
    throw new BadRequestException("Channel must be 'email' or 'sms'.");
  }
  return value as AuctionOtpChannel;
}

export function parseCode(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value.trim())) {
    throw new BadRequestException('Enter the 6-digit code.');
  }
  return value.trim();
}

export interface RegisterStartDto {
  fullName: string;
  email: string;
  phone: string;
  acceptTerms: true;
  smsConsent: boolean;
}

export function parseRegisterStart(raw: unknown): RegisterStartDto {
  const body = asBody(raw);
  if (body.acceptTerms !== true) {
    throw new BadRequestException(
      'You must accept the card authorization terms to register.',
    );
  }
  if (typeof body.smsConsent !== 'boolean') {
    throw new BadRequestException('smsConsent must be true or false.');
  }
  const fullName =
    typeof body.fullName === 'string'
      ? body.fullName.replace(/\s+/g, ' ').trim()
      : '';

  if (fullName.length < 1 || fullName.length > 80 || hasControlChar(fullName)) {
    throw new BadRequestException(
      'Enter your full name (up to 80 characters).',
    );
  }
  return {
    fullName,
    email: normalizeEmail(body.email),
    phone: normalizePhone(body.phone),
    acceptTerms: true,
    smsConsent: body.smsConsent,
  };
}

export interface VerifyDto {
  email: string;
  channel: AuctionOtpChannel;
  code: string;
}

export function parseVerify(raw: unknown): VerifyDto {
  const body = asBody(raw);
  return {
    email: normalizeEmail(body.email),
    channel: parseChannel(body.channel),
    code: parseCode(body.code),
  };
}

export interface ResendDto {
  email: string;
  channel: AuctionOtpChannel;
}

export function parseResend(raw: unknown): ResendDto {
  const body = asBody(raw);
  return {
    email: normalizeEmail(body.email),
    channel: parseChannel(body.channel),
  };
}

export function parseLoginStart(raw: unknown): { email: string } {
  return { email: normalizeEmail(asBody(raw).email) };
}

export function parseLoginVerify(raw: unknown): {
  email: string;
  code: string;
} {
  const body = asBody(raw);
  return { email: normalizeEmail(body.email), code: parseCode(body.code) };
}
