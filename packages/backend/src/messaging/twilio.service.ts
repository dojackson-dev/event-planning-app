import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

// STOP keywords per CTIA/carrier guidelines
const STOP_KEYWORDS = [
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
];
const START_KEYWORDS = ['START', 'UNSTOP', 'YES'];

// Compliance footer required by our campaign registration
const COMPLIANCE_FOOTER = ' Reply STOP to unsubscribe.';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client!: twilio.Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.client = twilio.default(accountSid, authToken);
    }
  }

  /**
   * Appends the mandatory "Reply STOP to unsubscribe." footer if not already present.
   * All outbound messages must include this per campaign registration.
   */
  private appendComplianceFooter(message: string): string {
    const normalized = message.trimEnd();
    if (normalized.toLowerCase().includes('reply stop to unsubscribe')) {
      return normalized;
    }
    return normalized + COMPLIANCE_FOOTER;
  }

  async sendSMS(
    to: string,
    message: string,
  ): Promise<{ sid: string; status: string }> {
    const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!this.client) {
      throw new Error(
        'Twilio client not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN',
      );
    }

    if (!from) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    // Ensure compliance footer is always present
    const body = this.appendComplianceFooter(message);

    try {
      const result = await this.client.messages.create({
        body,
        from,
        to,
      });

      return {
        sid: result.sid,
        status: result.status,
      };
    } catch (error) {
      this.logger.error('Twilio SMS send error', error);
      throw error;
    }
  }

  // ── Voice (internal staff calling) ──────────────────────────────

  /** The shared, voice-enabled business number used as caller ID. */
  getBusinessNumber(): string | undefined {
    return this.configService.get<string>('TWILIO_PHONE_NUMBER');
  }

  /** Places a call and returns its SID. Recording stays off. */
  async createCall(params: {
    to: string;
    url: string;
    statusCallback: string;
    timeoutSeconds: number;
  }): Promise<{ sid: string }> {
    const from = this.getBusinessNumber();
    if (!this.client || !from) {
      throw new Error('Twilio voice is not configured');
    }
    const call = await this.client.calls.create({
      to: params.to,
      from,
      url: params.url,
      method: 'POST',
      statusCallback: params.statusCallback,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['answered', 'completed'],
      timeout: params.timeoutSeconds,
    });
    return { sid: call.sid };
  }

  /** True when the signature proves the request really came from Twilio for this exact URL. */
  validateWebhook(
    signature: string | undefined,
    url: string,
    params: Record<string, unknown>,
  ): boolean {
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (!authToken || !signature) return false;
    return twilio.validateRequest(
      authToken,
      signature,
      url,
      params as Record<string, string>,
    );
  }

  /** Downloads a voicemail recording from Twilio (only Twilio-hosted recordings are fetched). */
  async fetchRecordingAudio(recordingUrl: string): Promise<Buffer> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (
      !accountSid ||
      !authToken ||
      !recordingUrl.startsWith('https://api.twilio.com/')
    ) {
      throw new Error('Recording unavailable');
    }
    const res = await fetch(`${recordingUrl}.mp3`, {
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    });
    if (!res.ok) throw new Error(`Recording fetch failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  async getMessageStatus(sid: string): Promise<string> {
    if (!this.client) {
      throw new Error('Twilio client not configured');
    }

    try {
      const message = await this.client.messages(sid).fetch();
      return message.status;
    } catch (error) {
      this.logger.error('Twilio status check error', error);
      throw error;
    }
  }

  /**
   * Parses an inbound Twilio webhook body and determines if it is a
   * STOP (opt-out) or START (opt-in) request.
   * Returns: { action: 'stop' | 'start' | null, from: string }
   */
  parseInboundMessage(
    body: string,
    from: string,
  ): { action: 'stop' | 'start' | null; from: string } {
    const keyword = body.trim().toUpperCase();
    if (STOP_KEYWORDS.includes(keyword)) {
      return { action: 'stop', from };
    }
    if (START_KEYWORDS.includes(keyword)) {
      return { action: 'start', from };
    }
    return { action: null, from };
  }
}
