import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: twilio.Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.client = twilio.default(accountSid, authToken);
    }
  }

  async sendSMS(to: string, message: string): Promise<{ sid: string; status: string }> {
    const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!this.client) {
      throw new Error('Twilio client not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }

    if (!from) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: from,
        to: to,
      });

      return {
        sid: result.sid,
        status: result.status,
      };
    } catch (error) {
      console.error('Twilio SMS Error:', error);
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
      console.error('Twilio Status Check Error:', error);
      throw error;
    }
  }
}
