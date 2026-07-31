import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHmac, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import {
  renderTemplate,
  EmailTemplateKey,
  PortalType,
} from './scheduled-emails.templates';

interface EnqueueSignupParams {
  userId: string;
  email: string;
  firstName: string;
  portalType: PortalType;
  /** Public shareable profile URL, if one exists yet for this portal/role. */
  shareableUrl?: string;
  dashboardUrl: string;
}

const QUICK_START_TEMPLATE: Record<PortalType, EmailTemplateKey> = {
  owner: 'venue_owner_quick_start',
  artist: 'artist_quick_start',
  vendor: 'vendor_quick_start',
  promoter: 'promoter_quick_start',
};

const FIRST_ACTION_TEMPLATE: Record<PortalType, EmailTemplateKey> = {
  owner: 'venue_first_action',
  artist: 'artist_first_action',
  vendor: 'vendor_first_action',
  promoter: 'promoter_first_action',
};

const FIRST_ACTION_TEMPLATE_KEYS: EmailTemplateKey[] = Object.values(
  FIRST_ACTION_TEMPLATE,
);

const PROFILE_TABLE: Record<'artist' | 'vendor' | 'promoter', string> = {
  artist: 'artist_accounts',
  vendor: 'vendor_accounts',
  promoter: 'promoter_accounts',
};

/**
 * Hybrid signup-email system: signup flows (and weekly/reengagement sweeps)
 * enqueue rows into `email_jobs`; this service's CRON is the "mailroom" that
 * sends whatever is due — it does not decide marketing strategy.
 */
@Injectable()
export class ScheduledEmailsService {
  private readonly logger = new Logger(ScheduledEmailsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  private get dashboardUrlFallback(): string {
    return process.env.FRONTEND_URL || 'https://eventecos.com';
  }

  private get backendUrl(): string {
    return (
      process.env.BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'https://api.eventecos.com'
    );
  }

  private get unsubscribeSecret(): string {
    const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
    if (!secret) {
      this.logger.warn(
        'EMAIL_UNSUBSCRIBE_SECRET is not set — unsubscribe links will use an insecure fallback. Set this env var in production.',
      );
    }
    return secret || 'insecure-dev-only-unsubscribe-secret';
  }

  private signUnsubscribeToken(userId: string): string {
    return createHmac('sha256', this.unsubscribeSecret)
      .update(userId)
      .digest('hex');
  }

  private verifyUnsubscribeToken(userId: string, signature: string): boolean {
    const expected = this.signUnsubscribeToken(userId);
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signature || '', 'hex');
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  private buildUnsubscribeUrl(userId: string): string {
    const sig = this.signUnsubscribeToken(userId);
    return `${this.backendUrl}/email-preferences/unsubscribe?uid=${userId}&sig=${sig}`;
  }

  /** Used by EmailPreferencesController to verify + apply an unsubscribe request. */
  async unsubscribeUser(userId: string, signature: string): Promise<boolean> {
    if (!this.verifyUnsubscribeToken(userId, signature)) return false;
    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin
      .from('users')
      .update({ email_unsubscribed_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) {
      this.logger.error(
        `Failed to unsubscribe user ${userId}: ${error.message}`,
      );
      return false;
    }
    return true;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  // ─── Signup sequence enqueue ───────────────────────────────────────────

  /**
   * Called (non-fatally) right after a signup succeeds for any of the four
   * roles. Queues the core lifecycle sequence: immediate welcome, +1 day
   * quick start, +3 day profile-incomplete nudge, +7 day first-action nudge.
   * The 3-day and 7-day jobs are skipped at send time if the user already
   * completed the relevant step (see shouldSuppressForTemplate).
   */
  async enqueueSignupSequence(params: EnqueueSignupParams): Promise<void> {
    try {
      const admin = this.supabaseService.getAdminClient();
      const now = new Date();
      const metadata = {
        firstName: params.firstName,
        shareableUrl: params.shareableUrl,
        dashboardUrl: params.dashboardUrl || this.dashboardUrlFallback,
      };

      const rows = [
        {
          email_type: 'welcome',
          template_key: 'welcome_shareable_link' as EmailTemplateKey,
          scheduled_for: now,
        },
        {
          email_type: 'quick_start',
          template_key: QUICK_START_TEMPLATE[params.portalType],
          scheduled_for: this.addDays(now, 1),
        },
        {
          email_type: 'profile_incomplete',
          template_key: 'profile_incomplete' as EmailTemplateKey,
          scheduled_for: this.addDays(now, 3),
        },
        {
          email_type: 'first_action',
          template_key: FIRST_ACTION_TEMPLATE[params.portalType],
          scheduled_for: this.addDays(now, 7),
        },
      ].map((row) => ({
        user_id: params.userId,
        email_type: row.email_type,
        portal_type: params.portalType,
        recipient_email: params.email,
        template_key: row.template_key,
        scheduled_for: row.scheduled_for.toISOString(),
        status: 'pending',
        metadata_json: metadata,
      }));

      const { error } = await admin.from('email_jobs').insert(rows);
      if (error) {
        this.logger.warn(
          `Failed to enqueue signup email sequence for user ${params.userId}: ${error.message}`,
        );
      }
    } catch (err) {
      // Never let email queueing block account creation.
      this.logger.warn(
        `enqueueSignupSequence threw for user ${params.userId}: ${err}`,
      );
    }
  }

  // ─── CRON: process due jobs (the "mailroom") ──────────────────────────

  @Cron('*/15 * * * *')
  async processDueEmailJobs(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const { data: jobs, error } = await admin
      .from('email_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (error) {
      this.logger.error(`Failed to fetch due email jobs: ${error.message}`);
      return;
    }
    if (!jobs?.length) return;

    for (const job of jobs) {
      await this.processJob(admin, job);
    }
  }

  private async processJob(admin: any, job: any): Promise<void> {
    // Claim the job so overlapping cron runs don't double-send.
    const { data: claimed } = await admin
      .from('email_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id');
    if (!claimed?.length) return;

    try {
      const { data: user } = await admin
        .from('users')
        .select('id, status, email_unsubscribed_at')
        .eq('id', job.user_id)
        .maybeSingle();

      if (!user || user.status !== 'active' || user.email_unsubscribed_at) {
        await this.finalizeJob(admin, job.id, 'cancelled', {
          last_error: 'suppressed: user inactive or unsubscribed',
        });
        return;
      }

      const suppressed = await this.shouldSuppressForTemplate(admin, job);
      if (suppressed) {
        await this.finalizeJob(admin, job.id, 'cancelled', {
          last_error:
            'suppressed: profile already complete / action already taken',
        });
        return;
      }

      const meta = job.metadata_json || {};
      let profileCompletionPercentage = meta.profileCompletionPercentage;
      let missingProfileItems = meta.missingProfileItems;

      if (job.template_key === 'profile_incomplete') {
        const completion = await this.computeProfileCompletion(
          admin,
          job.portal_type,
          job.user_id,
        );
        profileCompletionPercentage = completion.percentage;
        missingProfileItems = completion.missingItems;
      }

      const { subject, html } = renderTemplate(job.template_key, {
        firstName: meta.firstName || '',
        portalType: job.portal_type,
        shareableUrl: meta.shareableUrl,
        dashboardUrl: meta.dashboardUrl || this.dashboardUrlFallback,
        profileCompletionPercentage,
        missingProfileItems,
        profileViews: meta.profileViews,
        linkClicks: meta.linkClicks,
        newInquiries: meta.newInquiries,
        newConnections: meta.newConnections,
        upcomingEventCount: meta.upcomingEventCount,
        openTaskCount: meta.openTaskCount,
        unsubscribeUrl: this.buildUnsubscribeUrl(job.user_id),
      });

      await this.mailService.sendResendEmail({
        to: job.recipient_email,
        subject,
        html,
      });

      await this.finalizeJob(admin, job.id, 'sent', {
        sent_at: new Date().toISOString(),
      });
    } catch (err) {
      const attempt = (job.attempt_count || 0) + 1;
      await this.finalizeJob(
        admin,
        job.id,
        attempt >= 3 ? 'failed' : 'pending',
        {
          attempt_count: attempt,
          last_error: err instanceof Error ? err.message : String(err),
        },
      );
      this.logger.error(
        `Email job ${job.id} failed (attempt ${attempt}): ${err}`,
      );
    }
  }

  private async finalizeJob(
    admin: any,
    id: string,
    status: string,
    extra: Record<string, any> = {},
  ): Promise<void> {
    await admin
      .from('email_jobs')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', id);
  }

  // ─── Suppression rules ─────────────────────────────────────────────────

  private async shouldSuppressForTemplate(
    admin: any,
    job: any,
  ): Promise<boolean> {
    const portalType = job.portal_type as PortalType;

    if (job.template_key === 'profile_incomplete') {
      return this.isProfileComplete(admin, portalType, job.user_id);
    }
    if (FIRST_ACTION_TEMPLATE_KEYS.includes(job.template_key)) {
      return this.hasTakenFirstAction(admin, portalType, job.user_id);
    }
    return false;
  }

  private async getOwnerAccountId(
    admin: any,
    userId: string,
  ): Promise<string | null> {
    const { data } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .limit(1);
    return data?.[0]?.owner_account_id ?? null;
  }

  private async isProfileComplete(
    admin: any,
    portalType: PortalType,
    userId: string,
  ): Promise<boolean> {
    if (portalType === 'owner') {
      const ownerAccountId = await this.getOwnerAccountId(admin, userId);
      if (!ownerAccountId) return false;
      const { data } = await admin
        .from('venues')
        .select('description')
        .eq('owner_account_id', ownerAccountId)
        .limit(1);
      const venue = data?.[0];
      return !!venue?.description && venue.description.trim().length > 0;
    }

    const { data } = await admin
      .from(PROFILE_TABLE[portalType])
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    return !!data?.[0];
  }

  private async hasTakenFirstAction(
    admin: any,
    portalType: PortalType,
    userId: string,
  ): Promise<boolean> {
    if (portalType === 'owner') {
      const ownerAccountId = await this.getOwnerAccountId(admin, userId);
      if (!ownerAccountId) return false;
      const { data } = await admin
        .from('events')
        .select('id')
        .eq('owner_id', ownerAccountId)
        .limit(1);
      return !!data?.[0];
    }

    if (portalType === 'promoter') {
      const { data: promoter } = await admin
        .from('promoter_accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      const promoterAccountId = promoter?.[0]?.id;
      if (!promoterAccountId) return false;
      const { data } = await admin
        .from('public_events')
        .select('id')
        .eq('promoter_account_id', promoterAccountId)
        .limit(1);
      return !!data?.[0];
    }

    // Vendor/artist profiles are only created via a dedicated "complete your
    // profile" step, so completing that step *is* the meaningful first action.
    return this.isProfileComplete(admin, portalType, userId);
  }

  /**
   * Approximates completion % for the profile_incomplete nudge. For owners
   * this checks a few key venue fields (photos aren't tracked in `venues`
   * yet, so this is necessarily a partial signal). For vendor/artist/
   * promoter, the account row either exists (100%) or doesn't (0%) — those
   * roles don't have a partial-profile state today.
   */
  private async computeProfileCompletion(
    admin: any,
    portalType: PortalType,
    userId: string,
  ): Promise<{ percentage: number; missingItems: string[] }> {
    if (portalType === 'owner') {
      const ownerAccountId = await this.getOwnerAccountId(admin, userId);
      if (!ownerAccountId) {
        return { percentage: 0, missingItems: ['Venue details'] };
      }
      const { data } = await admin
        .from('venues')
        .select('description, capacity, website')
        .eq('owner_account_id', ownerAccountId)
        .limit(1);
      const venue = data?.[0] || {};
      const checks: Array<[boolean, string]> = [
        [!!venue.description, 'Venue description'],
        [!!venue.capacity, 'Venue capacity'],
        [!!venue.website, 'Venue website'],
      ];
      const missingItems = checks
        .filter(([ok]) => !ok)
        .map(([, label]) => label);
      const percentage = Math.round(
        ((checks.length - missingItems.length) / checks.length) * 100,
      );
      return { percentage, missingItems };
    }

    const complete = await this.isProfileComplete(admin, portalType, userId);
    return {
      percentage: complete ? 100 : 0,
      missingItems: complete ? [] : this.quickStartFallback(portalType),
    };
  }

  private quickStartFallback(portalType: PortalType): string[] {
    switch (portalType) {
      case 'artist':
        return ['Media/press kit', 'Genres & booking contact', 'Rate range'];
      case 'vendor':
        return ['Services & pricing', 'Photos of your work', 'Service area'];
      case 'promoter':
        return ['Company details', 'Venue partner', 'First event'];
      default:
        return [];
    }
  }

  // ─── Weekly digest + inactivity re-engagement sweeps ──────────────────

  private primaryPortalType(
    roles: string[] | null | undefined,
  ): PortalType | null {
    const order: PortalType[] = ['owner', 'vendor', 'promoter', 'artist'];
    for (const role of order) {
      if (roles?.includes(role)) return role;
    }
    return null;
  }

  private async hasJobSince(
    admin: any,
    userId: string,
    templateKey: EmailTemplateKey,
    sinceDaysAgo: number,
  ): Promise<boolean> {
    const since = this.addDays(new Date(), -sinceDaysAgo).toISOString();
    const { data } = await admin
      .from('email_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('template_key', templateKey)
      .in('status', ['pending', 'processing', 'sent'])
      .gte('created_at', since)
      .limit(1);
    return !!data?.[0];
  }

  /** Mondays 8 AM UTC: queue a weekly digest for every active, subscribed user. */
  @Cron('0 8 * * 1')
  async prepareWeeklyDigest(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const { data: users, error } = await admin
      .from('users')
      .select('id, email, first_name, roles, status, email_unsubscribed_at')
      .eq('status', 'active')
      .is('email_unsubscribed_at', null);

    if (error || !users) {
      if (error) this.logger.error(`prepareWeeklyDigest: ${error.message}`);
      return;
    }

    for (const user of users) {
      const portalType = this.primaryPortalType(user.roles);
      if (!portalType) continue;

      const alreadyQueued = await this.hasJobSince(
        admin,
        user.id,
        'weekly_digest',
        6,
      );
      if (alreadyQueued) continue;

      await admin.from('email_jobs').insert({
        user_id: user.id,
        email_type: 'weekly_digest',
        portal_type: portalType,
        recipient_email: user.email,
        template_key: 'weekly_digest',
        scheduled_for: new Date().toISOString(),
        status: 'pending',
        metadata_json: {
          firstName: user.first_name,
          dashboardUrl: this.dashboardUrlFallback,
          // NOTE: profile_views / link_clicks / new_inquiries / new_connections
          // have no backing analytics instrumentation yet. Omitted here until
          // that tracking exists — the template renders only the metrics present.
        },
      });
    }
  }

  /** Daily 9 AM UTC: queue a one-time re-engagement email for accounts inactive 30+ days. */
  @Cron('0 9 * * *')
  async prepareInactiveReengagement(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const cutoff = this.addDays(new Date(), -30).toISOString();

    const { data: users, error } = await admin
      .from('users')
      .select(
        'id, email, first_name, roles, status, email_unsubscribed_at, created_at',
      )
      .eq('status', 'active')
      .is('email_unsubscribed_at', null)
      .lte('created_at', cutoff);

    if (error || !users) {
      if (error)
        this.logger.error(`prepareInactiveReengagement: ${error.message}`);
      return;
    }

    for (const user of users) {
      const portalType = this.primaryPortalType(user.roles);
      if (!portalType) continue;

      // NOTE: `users` has no last-active/last-login column today, so this
      // uses account age as a rough proxy and sends at most once ever. This
      // should be replaced with real last-activity tracking when available.
      const alreadySent = await this.hasJobSince(
        admin,
        user.id,
        'inactive_user_reengagement',
        3650,
      );
      if (alreadySent) continue;

      await admin.from('email_jobs').insert({
        user_id: user.id,
        email_type: 'inactive_reengagement',
        portal_type: portalType,
        recipient_email: user.email,
        template_key: 'inactive_user_reengagement',
        scheduled_for: new Date().toISOString(),
        status: 'pending',
        metadata_json: {
          firstName: user.first_name,
          dashboardUrl: this.dashboardUrlFallback,
        },
      });
    }
  }
}
