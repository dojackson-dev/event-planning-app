import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { TwilioService } from '../../messaging/twilio.service';
import type { AuctionOtpChannel } from '../auction.types';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface OtpDeliveryContext {
  bidderId: string;
  auctionTitle?: string;
}

/** Sends one-time codes by email (Resend) or SMS (Twilio). Never throws and never logs contact details. */
@Injectable()
export class AuctionOtpDelivery {
  private readonly logger = new Logger(AuctionOtpDelivery.name);

  constructor(private readonly twilio: TwilioService) {}

  async send(
    channel: AuctionOtpChannel,
    destination: string,
    code: string,
    ctx: OtpDeliveryContext,
  ): Promise<boolean> {
    try {
      const delivered =
        channel === 'email'
          ? await this.sendEmail(destination, code, ctx)
          : await this.sendSms(destination, code);
      if (!delivered) this.logUndelivered(channel, code, ctx, 'not configured');
      return delivered;
    } catch (err) {
      const detail = (err as { code?: string | number } | undefined)?.code;
      this.logUndelivered(
        channel,
        code,
        ctx,
        `send failed${detail !== undefined ? ` (${detail})` : ''}`,
      );
      return false;
    }
  }

  private async sendEmail(
    to: string,
    code: string,
    ctx: OtpDeliveryContext,
  ): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return false;
    const from = process.env.RESEND_FROM || 'EventEcos <noreply@eventecos.com>';
    const title = ctx.auctionTitle
      ? escapeHtml(ctx.auctionTitle)
      : 'the auction';
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
  <h2>Your verification code</h2>
  <p>Use this code to verify your email for ${title}:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${escapeHtml(code)}</p>
  <p>It expires in 10 minutes. If you did not request it, you can ignore this email.</p>
</div>`;
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: [to],
      subject: 'Your EventEcos auction verification code',
      html,
      text: `Your EventEcos auction verification code is ${code}. It expires in 10 minutes.`,
    });
    if (error) throw new Error(error.message || 'Resend failed');
    return true;
  }

  private async sendSms(to: string, code: string): Promise<boolean> {
    await this.twilio.sendSMS(
      to,
      `Your EventEcos auction verification code is ${code}. It expires in 10 minutes.`,
    );
    return true;
  }

  private logUndelivered(
    channel: AuctionOtpChannel,
    code: string,
    ctx: OtpDeliveryContext,
    reason: string,
  ): void {
    const base = `Auction ${channel} code not delivered (${reason}) for bidder ${ctx.bidderId}`;
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(base);
    } else if (process.env.NODE_ENV === 'development') {
      this.logger.warn(`${base}; dev code: ${code}`);
    } else {
      this.logger.warn(base);
    }
  }
}
