import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

// STOP keywords per CTIA/carrier guidelines
const STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const START_KEYWORDS = ['START', 'UNSTOP', 'YES'];

// Compliance footer required by our campaign registration
const COMPLIANCE_FOOTER = ' Reply STOP to unsubscribe.';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: twilio.Twilio;

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

  async sendSMS(to: string, message: string): Promise<{ sid: string; status: string }> {
    const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!this.client) {
      throw new Error('Twilio client not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
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
  parseInboundMessage(body: string, from: string): { action: 'stop' | 'start' | null; from: string } {
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
