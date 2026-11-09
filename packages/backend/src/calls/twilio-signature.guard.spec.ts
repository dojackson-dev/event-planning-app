import { CallsWebhookController } from './calls-webhook.controller';
import { TwilioSignatureGuard } from './twilio-signature.guard';
import { TwilioService } from '../messaging/twilio.service';
import * as twilio from 'twilio';
import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';

const TOKEN = 'test-auth-token';
const BASE = 'https://api.example.test';

function context(
  path: string,
  body: Record<string, string>,
  signature?: string,
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        originalUrl: path,
        body,
        headers: signature ? { 'x-twilio-signature': signature } : {},
      }),
    }),
  } as any;
}

function guardWith(base: string | undefined) {
  const config = {
    get: (k: string) =>
      k === 'API_PUBLIC_URL'
        ? base
        : k === 'TWILIO_AUTH_TOKEN'
          ? TOKEN
          : undefined,
  };
  const twilioService = new TwilioService(config as any);
  return new TwilioSignatureGuard(config as any, twilioService);
}

describe('TwilioSignatureGuard', () => {
  const path = '/calls/hook/staff-confirm?logId=abc';
  const body = { Digits: '1', CallSid: 'CA1' };

  it('accepts a request Twilio signed for this exact URL', () => {
    const signature = twilio.getExpectedTwilioSignature(
      TOKEN,
      `${BASE}${path}`,
      body,
    );
    expect(guardWith(BASE).canActivate(context(path, body, signature))).toBe(
      true,
    );
  });

  it('rejects a missing, wrong or replayed-on-another-URL signature', () => {
    const guard = guardWith(BASE);
    expect(() => guard.canActivate(context(path, body))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(context(path, body, 'forged'))).toThrow(
      ForbiddenException,
    );
    const other = twilio.getExpectedTwilioSignature(
      TOKEN,
      `${BASE}/calls/hook/staff-confirm?logId=other`,
      body,
    );
    expect(() => guard.canActivate(context(path, body, other))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a tampered body', () => {
    const signature = twilio.getExpectedTwilioSignature(
      TOKEN,
      `${BASE}${path}`,
      body,
    );
    expect(() =>
      guardWith(BASE).canActivate(
        context(path, { ...body, Digits: '9' }, signature),
      ),
    ).toThrow(ForbiddenException);
  });

  it('refuses everything when the public API URL is not configured', () => {
    expect(() => guardWith(undefined).canActivate(context(path, body))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('guards every Twilio webhook route', () => {
    const guards = Reflect.getMetadata('__guards__', CallsWebhookController);
    expect(guards).toContain(TwilioSignatureGuard);
  });
});
