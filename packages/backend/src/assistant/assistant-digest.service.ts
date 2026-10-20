import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { AssistantService } from './assistant.service';
import { buildDigestEmail } from './assistant-digest';

@Injectable()
export class AssistantDigestService {
  private readonly logger = new Logger(AssistantDigestService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly assistantService: AssistantService,
    private readonly mailService: MailService,
  ) {}

  // 9 AM CDT, alongside the other morning reminder jobs.
  @Cron('0 14 * * *')
  async sendDailyDigests(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const { data: prefs, error } = await admin
      .from('assistant_preferences')
      .select('user_id')
      .eq('digest_enabled', true);
    if (error) {
      this.logger.warn(`Digest preferences query failed: ${error.message}`);
      return;
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://eventecos.com';
    let sent = 0;
    for (const { user_id } of prefs ?? []) {
      try {
        const summary = await this.assistantService.getSummary(user_id);
        const email = buildDigestEmail(summary, baseUrl);
        if (!email) continue;
        const { data } = await admin.auth.admin.getUserById(user_id);
        const to = data?.user?.email;
        if (!to) continue;
        await this.mailService.sendReminderEmail({
          toEmail: to,
          toName: 'there',
          subject: email.subject,
          body: email.body,
        });
        sent++;
      } catch (err) {
        this.logger.error(
          `Digest failed for ${user_id}: ${(err as Error).message}`,
        );
      }
    }
    this.logger.log(`Assistant digests sent: ${sent}`);
  }
}
