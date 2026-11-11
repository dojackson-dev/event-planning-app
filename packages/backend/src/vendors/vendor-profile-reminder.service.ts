import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

/** Internal and test mailboxes never get customer reminders. */
const INTERNAL_EMAIL_DOMAINS = ['eventecos.com', 'dovenue.com'];

const DEFAULT_MIN_AGE_DAYS = 3;
const DEFAULT_LIMIT = 50;

export interface ProfileReminderCandidate {
  id: string;
  business_name: string;
  email: string;
  phone: string | null;
  missing: string[];
}

export interface ProfileReminderResult {
  eligible: ProfileReminderCandidate[];
  emailed: number;
  texted: number;
}

const blank = (value: string | null | undefined) => !(value ?? '').trim();

/** Which of the branding images a vendor still has to add. */
export function missingBranding(vendor: {
  profile_image_url?: string | null;
  cover_image_url?: string | null;
}): string[] {
  const missing: string[] = [];
  if (blank(vendor.profile_image_url)) missing.push('profile photo');
  if (blank(vendor.cover_image_url)) missing.push('banner');
  return missing;
}

export function isInternalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  return INTERNAL_EMAIL_DOMAINS.includes(domain);
}

/**
 * Sends each vendor one reminder to add the profile photo and banner they are missing.
 * A vendor is stamped before anything is sent, so overlapping runs cannot send twice.
 */
@Injectable()
export class VendorProfileReminderService {
  private readonly logger = new Logger(VendorProfileReminderService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {}

  private get frontendUrl() {
    return process.env.FRONTEND_URL || 'https://www.eventecos.com';
  }

  /** Every morning (US Central); only vendors a few days past sign-up are asked. */
  @Cron('0 15 * * *')
  async sendDaily() {
    // Set VENDOR_PROFILE_REMINDERS=off on an environment (a demo, say) that must not contact vendors.
    if (process.env.VENDOR_PROFILE_REMINDERS === 'off') return;
    try {
      const result = await this.run();
      if (result.eligible.length > 0) {
        this.logger.log(
          `Profile reminders: ${result.emailed} emailed, ${result.texted} texted`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Profile reminder run failed: ${(err as Error).message}`,
      );
    }
  }

  async findEligible(minAgeDays: number): Promise<ProfileReminderCandidate[]> {
    const cutoff = new Date(Date.now() - minAgeDays * 86_400_000).toISOString();
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('vendor_accounts')
      .select(
        'id, business_name, email, phone, profile_image_url, cover_image_url, created_at, is_active',
      )
      .eq('is_active', true)
      .is('profile_reminder_sent_at', null)
      .limit(500);
    if (error) throw new Error(error.message);

    return ((data ?? []) as any[])
      .filter((v) => !blank(v.email) && !isInternalEmail(v.email))
      .filter((v) => !v.created_at || v.created_at <= cutoff)
      .map((v) => ({
        id: v.id as string,
        business_name: (v.business_name as string) || 'there',
        email: (v.email as string).trim(),
        phone: (v.phone as string | null) || null,
        missing: missingBranding(v),
      }))
      .filter((v) => v.missing.length > 0);
  }

  async run(
    options: { dryRun?: boolean; minAgeDays?: number; limit?: number } = {},
  ): Promise<ProfileReminderResult> {
    const eligible = await this.findEligible(
      options.minAgeDays ?? DEFAULT_MIN_AGE_DAYS,
    );
    const result: ProfileReminderResult = { eligible, emailed: 0, texted: 0 };
    if (options.dryRun) return result;

    const admin = this.supabaseService.getAdminClient();
    const link = `${this.frontendUrl}/vendors/dashboard/profile`;

    for (const vendor of eligible.slice(0, options.limit ?? DEFAULT_LIMIT)) {
      const { data: claimed } = await admin
        .from('vendor_accounts')
        .update({ profile_reminder_sent_at: new Date().toISOString() })
        .eq('id', vendor.id)
        .is('profile_reminder_sent_at', null)
        .select('id');
      if (!claimed?.length) continue;

      const emailed = await this.mailService.sendVendorProfileReminder({
        toEmail: vendor.email,
        businessName: vendor.business_name,
        missing: vendor.missing,
        link,
      });
      const texted = await this.smsNotifications.vendorProfileReminder(
        vendor.phone,
        vendor.business_name,
        link,
      );

      if (!emailed && !texted) {
        // Nothing reached them, so let the next run try again.
        await admin
          .from('vendor_accounts')
          .update({ profile_reminder_sent_at: null })
          .eq('id', vendor.id);
        this.logger.warn(`Profile reminder not delivered to ${vendor.id}`);
        continue;
      }
      if (emailed) result.emailed++;
      if (texted) result.texted++;
    }
    return result;
  }
}
