import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { SmsNotificationsService } from './sms-notifications.service';
import { normalizePhone } from '../calls/phone';

/** Texts and emails a second one only after this long, so a run of messages is one alert. */
export const ALERT_QUIET_MINUTES = 10;

export interface MessageAlert {
  ownerId: string;
  fromName: string;
  /** Digits-insensitive phone of whoever wrote, used to avoid alerting an owner about themselves. */
  fromPhone?: string | null;
  text: string;
  channel: 'text' | 'chat';
  eventName?: string | null;
  /** True when the owner was already alerted about an earlier unread message in this conversation. */
  alreadyAlerted: boolean;
}

const preview = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max
    ? clean
    : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

@Injectable()
export class MessageAlertsService {
  private readonly logger = new Logger(MessageAlertsService.name);
  private readonly link: string;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly mail: MailService,
    private readonly sms: SmsNotificationsService,
    config: ConfigService,
  ) {
    const base = (
      config.get<string>('FRONTEND_URL') || 'https://www.eventecos.com'
    ).replace(/\/+$/, '');
    this.link = `${base}/dashboard/messages`;
  }

  /** Alerts the owner by email and text. Never throws: a failed alert must not lose the message. */
  async notifyOwner(alert: MessageAlert): Promise<void> {
    if (alert.alreadyAlerted) return;
    try {
      const { data: owner } = await this.supabase
        .getAdminClient()
        .from('users')
        .select('email, first_name, phone_number, sms_opt_in')
        .eq('id', alert.ownerId)
        .maybeSingle();
      if (!owner) return;

      const ownerPhone = normalizePhone(owner.phone_number);
      const fromOwnNumber =
        !!ownerPhone &&
        !!alert.fromPhone &&
        normalizePhone(alert.fromPhone) === ownerPhone;
      if (fromOwnNumber) return;

      const about = alert.eventName ? ` about ${alert.eventName}` : '';
      const textBody =
        alert.channel === 'text'
          ? `EventEcos: ${alert.fromName} texted you: "${preview(alert.text, 90)}" Reply: ${this.link}`
          : `EventEcos: ${alert.fromName} messaged you${about}: "${preview(alert.text, 90)}" Reply: ${this.link}`;

      await Promise.all([
        owner.email
          ? this.mail.sendMessageAlert({
              toEmail: owner.email,
              ownerName: owner.first_name,
              fromName: alert.fromName,
              channel: alert.channel,
              eventName: alert.eventName,
              preview: preview(alert.text, 500),
              link: this.link,
            })
          : Promise.resolve(false),
        ownerPhone && owner.sms_opt_in !== false
          ? this.sms.sendOne(ownerPhone, textBody)
          : Promise.resolve(false),
      ]);
    } catch (err) {
      this.logger.warn(`Message alert failed: ${(err as Error).message}`);
    }
  }
}
