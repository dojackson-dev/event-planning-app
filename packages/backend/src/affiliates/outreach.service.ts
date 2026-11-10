import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import {
  LeadAgent,
  SALES_MANAGER_EMAIL,
  isMissingSchema,
} from './leads.service';
import {
  OUTREACH_TEMPLATES,
  OutreachRecipient,
  OutreachTemplateId,
  firstNameOf,
  isHttpUrl,
  renderOutreach,
} from './outreach-templates';
import {
  normalizeEmailKey,
  unsubscribeSecretConfigured,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from './outreach-unsubscribe';
import { UUID_RE } from './lead-validation';

export const MAX_RECIPIENTS = 50;
const DEFAULT_DAILY_LIMIT = 100;
const REPEAT_WINDOW_DAYS = 14;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_ROLES = ['owner', 'promoter', 'artist', 'vendor'];

export interface OutreachSender extends LeadAgent {
  first_name?: string | null;
  last_name?: string | null;
}

export type SkipReason =
  | 'no_email'
  | 'invalid_email'
  | 'not_yours'
  | 'not_found'
  | 'unsubscribed'
  | 'recently_emailed'
  | 'duplicate';

interface Target {
  type: 'lead' | 'user' | 'email';
  id: string | null;
  email: string;
  name: string;
  business: string | null;
}

export interface OutreachRequest {
  template: OutreachTemplateId;
  subject: string;
  note: string | null;
  message: string | null;
  cta: { label: string; url: string } | null;
}

export interface SendResult {
  sent: number;
  failed: number;
  skipped: Array<{ name: string; reason: SkipReason }>;
  errors: string[];
}

function bad(message: string): never {
  throw new BadRequestException(message);
}

function optionalText(
  value: unknown,
  label: string,
  max: number,
): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') bad(`${label} must be text.`);
  const text = value.trim();
  if (text.length > max) bad(`${label} must be ${max} characters or fewer.`);
  return text || null;
}

/** Validates the compose form. The same rules apply to previews, tests and real sends. */
export function parseOutreachRequest(
  body: Record<string, unknown>,
): OutreachRequest {
  const template = body.template;
  if (typeof template !== 'string' || !(template in OUTREACH_TEMPLATES)) {
    bad(
      `Template must be one of: ${Object.keys(OUTREACH_TEMPLATES).join(', ')}.`,
    );
  }
  const id = template as OutreachTemplateId;
  const subject =
    optionalText(body.subject, 'Subject', 150) ??
    OUTREACH_TEMPLATES[id].subject;
  if (!subject) bad('Add a subject line.');
  const note = optionalText(body.note, 'Personal note', 1500);
  const message = optionalText(body.message, 'Message', 5000);
  if (id === 'custom' && !message) bad('Write your message.');

  const label = optionalText(body.cta_label, 'Button label', 40);
  const url = optionalText(body.cta_url, 'Button link', 500);
  if (Boolean(label) !== Boolean(url) && id === 'custom') {
    bad('A button needs both a label and a link.');
  }
  if (url && !isHttpUrl(url))
    bad('The button link must start with http:// or https://.');
  return {
    template: id,
    subject,
    note,
    message,
    cta: url ? { label: label ?? 'Learn more', url } : null,
  };
}

@Injectable()
export class OutreachService {
  private readonly logger = new Logger(OutreachService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly mail: MailService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private isManager(agent: LeadAgent): boolean {
    return agent.email === SALES_MANAGER_EMAIL;
  }

  private dailyLimit(): number {
    const parsed = Number.parseInt(process.env.OUTREACH_DAILY_LIMIT ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT;
  }

  private fail(what: string, error: { message: string; code?: string }): never {
    this.logger.error(`${what}: ${error.message}`);
    throw new ServiceUnavailableException(
      isMissingSchema(error)
        ? 'Email sending is being set up. Please try again later.'
        : 'Please try again shortly.',
    );
  }

  private senderName(agent: OutreachSender): string {
    const name = `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim();
    return name || 'The EventEcos team';
  }

  /** The address mail goes out from. Replies go to the sender's own address. */
  private fromAddress(agent: OutreachSender): string {
    const configured =
      process.env.OUTREACH_FROM || process.env.RESEND_FROM || '';
    const address =
      /<([^>]+)>/.exec(configured)?.[1] ??
      (configured || 'noreply@eventecos.com');
    const display = `${this.senderName(agent)} (EventEcos)`.replace(
      /["\r\n<>]/g,
      '',
    );
    return `"${display}" <${address}>`;
  }

  private async sentToday(agent: LeadAgent): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const { count, error } = await this.db
      .from('outreach_emails')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_id', agent.id)
      .eq('status', 'sent')
      .neq('recipient_type', 'test')
      .gte('created_at', start.toISOString());
    if (error) {
      if (isMissingSchema(error)) return 0;
      this.fail('Outreach count failed', error);
    }
    return count ?? 0;
  }

  async config(agent: OutreachSender) {
    const used = await this.sentToday(agent);
    const limit = this.dailyLimit();
    return {
      templates: Object.entries(OUTREACH_TEMPLATES).map(([id, t]) => ({
        id,
        label: t.label,
        subject: t.subject,
      })),
      sender_name: this.senderName(agent),
      reply_to: agent.email,
      daily_limit: limit,
      sent_today: used,
      remaining_today: Math.max(0, limit - used),
      max_recipients: MAX_RECIPIENTS,
      email_configured:
        Boolean(process.env.RESEND_API_KEY) && unsubscribeSecretConfigured(),
      postal_address_configured: Boolean(
        process.env.OUTREACH_POSTAL_ADDRESS?.trim(),
      ),
    };
  }

  /** Renders the email exactly as it will be sent, for the first recipient (or an example name). */
  preview(
    agent: OutreachSender,
    body: Record<string, unknown>,
  ): { subject: string; html: string; text: string } {
    const request = parseOutreachRequest(body);
    const sample = (
      body.sample && typeof body.sample === 'object' ? body.sample : {}
    ) as Record<string, unknown>;
    const name =
      typeof sample.name === 'string' && sample.name.trim()
        ? sample.name
        : 'Alex Rivera';
    const business =
      typeof sample.business === 'string' && sample.business.trim()
        ? sample.business
        : null;
    return this.render(
      agent,
      request,
      { name, business },
      'preview@example.com',
    );
  }

  private render(
    agent: OutreachSender,
    request: OutreachRequest,
    recipient: OutreachRecipient,
    email: string,
  ) {
    return renderOutreach({
      ...request,
      recipient,
      senderName: this.senderName(agent),
      unsubscribeUrl: unsubscribeSecretConfigured()
        ? unsubscribeUrl(email)
        : 'https://www.eventecos.com/unsubscribe',
      postalAddress: process.env.OUTREACH_POSTAL_ADDRESS ?? null,
    });
  }

  // ─── Recipients ──────────────────────────────────────────────────────────

  private async resolveTargets(
    agent: LeadAgent,
    raw: unknown,
  ): Promise<{ targets: Target[]; skipped: SendResult['skipped'] }> {
    if (
      !Array.isArray(raw) ||
      raw.length === 0 ||
      raw.length > MAX_RECIPIENTS
    ) {
      bad(`Choose between 1 and ${MAX_RECIPIENTS} recipients.`);
    }
    const skipped: SendResult['skipped'] = [];
    const targets: Target[] = [];
    const leadIds: string[] = [];
    const userIds: string[] = [];
    const typed: Array<{ type: string; value: Record<string, unknown> }> = [];

    for (const item of raw as unknown[]) {
      const value = (item && typeof item === 'object' ? item : {}) as Record<
        string,
        unknown
      >;
      if (
        value.type === 'lead' &&
        typeof value.id === 'string' &&
        UUID_RE.test(value.id)
      ) {
        leadIds.push(value.id);
      } else if (
        value.type === 'user' &&
        typeof value.id === 'string' &&
        UUID_RE.test(value.id)
      ) {
        userIds.push(value.id);
      } else if (value.type !== 'email') {
        bad('A recipient is not valid.');
      }
      typed.push({ type: String(value.type), value });
    }
    if (userIds.length > 0 && !this.isManager(agent)) {
      throw new ForbiddenException(
        'Only the sales manager can email platform users.',
      );
    }

    const leads = new Map<string, Record<string, unknown>>();
    if (leadIds.length > 0) {
      const { data, error } = await this.db
        .from('demo_requests')
        .select('id, name, business_name, email, claimed_by_affiliate_id')
        .in('id', leadIds);
      if (error) this.fail('Outreach lead lookup failed', error);
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        leads.set(row.id as string, row);
      }
    }

    const users = new Map<string, Record<string, unknown>>();
    const businesses = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data, error } = await this.db
        .from('users')
        .select('id, email, first_name, last_name, role')
        .in('id', userIds)
        .in('role', USER_ROLES);
      if (error) this.fail('Outreach user lookup failed', error);
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        users.set(row.id as string, row);
      }
      const { data: accounts } = await this.db
        .from('owner_accounts')
        .select('primary_owner_id, business_name')
        .in('primary_owner_id', userIds);
      for (const account of (accounts ?? []) as Array<
        Record<string, unknown>
      >) {
        businesses.set(
          account.primary_owner_id as string,
          (account.business_name as string | null) ?? null,
        );
      }
    }

    for (const { type, value } of typed) {
      if (type === 'lead') {
        const lead = leads.get(value.id as string);
        if (!lead) {
          skipped.push({ name: 'A lead', reason: 'not_found' });
          continue;
        }
        const name = (lead.name as string) ?? 'A lead';
        if (
          !this.isManager(agent) &&
          lead.claimed_by_affiliate_id !== agent.id
        ) {
          skipped.push({ name, reason: 'not_yours' });
          continue;
        }
        const email = typeof lead.email === 'string' ? lead.email.trim() : '';
        if (!email) skipped.push({ name, reason: 'no_email' });
        else
          targets.push({
            type: 'lead',
            id: lead.id as string,
            email,
            name,
            business: (lead.business_name as string | null) ?? null,
          });
      } else if (type === 'user') {
        const user = users.get(value.id as string);
        if (!user) {
          skipped.push({ name: 'A user', reason: 'not_found' });
          continue;
        }
        const name =
          `${(user.first_name as string) ?? ''} ${(user.last_name as string) ?? ''}`.trim();
        const email = typeof user.email === 'string' ? user.email.trim() : '';
        if (!email)
          skipped.push({ name: name || 'A user', reason: 'no_email' });
        else
          targets.push({
            type: 'user',
            id: user.id as string,
            email,
            name: name || firstNameOf(email.split('@')[0]),
            business: businesses.get(user.id as string) ?? null,
          });
      } else {
        const email = typeof value.email === 'string' ? value.email.trim() : '';
        const name =
          typeof value.name === 'string' ? value.name.trim().slice(0, 120) : '';
        if (!EMAIL_RE.test(email) || email.length > 254) {
          skipped.push({
            name: email || 'An address',
            reason: 'invalid_email',
          });
        } else {
          targets.push({
            type: 'email',
            id: null,
            email,
            name: name || 'there',
            business: null,
          });
        }
      }
    }
    return { targets, skipped };
  }

  private async filterTargets(
    targets: Target[],
    skipped: SendResult['skipped'],
    allowRepeat: boolean,
  ): Promise<Target[]> {
    const seen = new Set<string>();
    const unique: Target[] = [];
    for (const target of targets) {
      const key = normalizeEmailKey(target.email);
      if (seen.has(key)) {
        skipped.push({ name: target.name, reason: 'duplicate' });
        continue;
      }
      seen.add(key);
      unique.push(target);
    }
    if (unique.length === 0) return [];
    const emails = unique.map((t) => normalizeEmailKey(t.email));

    const { data: suppressed, error } = await this.db
      .from('email_suppressions')
      .select('email')
      .in('email', emails);
    if (error) this.fail('Outreach suppression check failed', error);
    const blocked = new Set(
      ((suppressed ?? []) as Array<{ email: string }>).map((row) => row.email),
    );

    const recent = new Set<string>();
    if (!allowRepeat) {
      const since = new Date(
        Date.now() - REPEAT_WINDOW_DAYS * 86_400_000,
      ).toISOString();
      const { data: sent, error: recentError } = await this.db
        .from('outreach_emails')
        .select('to_email')
        .in('to_email', emails)
        .eq('status', 'sent')
        .neq('recipient_type', 'test')
        .gte('created_at', since);
      if (recentError) this.fail('Outreach history check failed', recentError);
      for (const row of (sent ?? []) as Array<{ to_email: string }>) {
        recent.add(row.to_email);
      }
    }

    return unique.filter((target) => {
      const key = normalizeEmailKey(target.email);
      if (blocked.has(key)) {
        skipped.push({ name: target.name, reason: 'unsubscribed' });
        return false;
      }
      if (recent.has(key)) {
        skipped.push({ name: target.name, reason: 'recently_emailed' });
        return false;
      }
      return true;
    });
  }

  // ─── Sending ─────────────────────────────────────────────────────────────

  private requireConfigured(): void {
    if (!process.env.RESEND_API_KEY || !unsubscribeSecretConfigured()) {
      throw new ServiceUnavailableException(
        'Email sending is not configured on the server yet.',
      );
    }
  }

  /** Sends one copy of the email to the sender, so they can check it in a real inbox. Not counted or logged on leads. */
  async sendTest(agent: OutreachSender, body: Record<string, unknown>) {
    this.requireConfigured();
    const request = parseOutreachRequest(body);
    const rendered = this.render(
      agent,
      request,
      { name: this.senderName(agent), business: null },
      agent.email,
    );
    const [result] = await this.mail.sendOutreachBatch([
      {
        from: this.fromAddress(agent),
        to: agent.email,
        replyTo: agent.email,
        subject: `[Test] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl(agent.email)}>` },
      },
    ]);
    await this.record(agent, [
      {
        target: {
          type: 'email',
          id: null,
          email: agent.email,
          name: this.senderName(agent),
          business: null,
        },
        recipientType: 'test',
        subject: `[Test] ${rendered.subject}`,
        template: request.template,
        result,
      },
    ]);
    if (result.error) {
      throw new ServiceUnavailableException(
        `The test email could not be sent: ${result.error}`,
      );
    }
    return { sent_to: agent.email };
  }

  async send(
    agent: OutreachSender,
    body: Record<string, unknown>,
  ): Promise<SendResult> {
    this.requireConfigured();
    const request = parseOutreachRequest(body);
    const { targets, skipped } = await this.resolveTargets(
      agent,
      body.recipients,
    );
    const sendable = await this.filterTargets(
      targets,
      skipped,
      body.allow_repeat === true,
    );

    const remaining = this.dailyLimit() - (await this.sentToday(agent));
    if (sendable.length > Math.max(0, remaining)) {
      bad(
        remaining > 0
          ? `You can send ${remaining} more email${remaining === 1 ? '' : 's'} today.`
          : 'You have reached today\u2019s sending limit.',
      );
    }
    if (sendable.length === 0)
      return { sent: 0, failed: 0, skipped, errors: [] };

    const messages = sendable.map((target) => {
      const rendered = this.render(
        agent,
        request,
        { name: target.name, business: target.business },
        target.email,
      );
      return {
        rendered,
        message: {
          from: this.fromAddress(agent),
          to: target.email,
          replyTo: agent.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl(target.email)}>` },
        },
      };
    });

    const results = await this.mail.sendOutreachBatch(
      messages.map((m) => m.message),
    );
    const entries = sendable.map((target, index) => ({
      target,
      recipientType: target.type,
      subject: messages[index].rendered.subject,
      template: request.template,
      result: results[index] ?? {
        id: null,
        error: 'No result from the email provider.',
      },
    }));
    await this.record(agent, entries);

    const sent = entries.filter((e) => !e.result.error);
    await this.touchLeads(agent, sent);
    this.logger.log(
      `Outreach: ${sent.length} sent, ${entries.length - sent.length} failed`,
    );
    return {
      sent: sent.length,
      failed: entries.length - sent.length,
      skipped,
      errors: [
        ...new Set(
          entries
            .filter((e) => e.result.error)
            .map((e) => e.result.error as string),
        ),
      ],
    };
  }

  private async record(
    agent: LeadAgent,
    entries: Array<{
      target: Target;
      recipientType: string;
      subject: string;
      template: string;
      result: { id: string | null; error: string | null };
    }>,
  ): Promise<void> {
    const rows = entries.map((e) => ({
      affiliate_id: agent.id,
      recipient_type: e.recipientType,
      lead_id: e.target.type === 'lead' ? e.target.id : null,
      user_id: e.target.type === 'user' ? e.target.id : null,
      to_email: normalizeEmailKey(e.target.email),
      to_name: e.target.name,
      template: e.template,
      subject: e.subject,
      status: e.result.error ? 'failed' : 'sent',
      provider_id: e.result.id,
      error: e.result.error,
    }));
    const { error } = await this.db.from('outreach_emails').insert(rows);
    if (error)
      this.logger.error(`Could not record outreach emails: ${error.message}`);
  }

  /** Emailing a lead counts as contact: it shows in the lead's timeline and updates Last contacted. */
  private async touchLeads(
    agent: LeadAgent,
    sent: Array<{ target: Target; subject: string }>,
  ): Promise<void> {
    const leads = sent.filter((e) => e.target.type === 'lead' && e.target.id);
    if (leads.length === 0) return;
    try {
      await this.db.from('lead_activities').insert(
        leads.map((e) => ({
          lead_id: e.target.id,
          affiliate_id: agent.id,
          type: 'email',
          direction: 'outbound',
          subject: e.subject,
          body: 'Sent from the sales portal',
          outcome: 'Sent',
        })),
      );
      await this.db
        .from('demo_requests')
        .update({ last_contacted_at: new Date().toISOString() })
        .in(
          'id',
          leads.map((e) => e.target.id as string),
        );
    } catch (err) {
      this.logger.warn(`Could not log outreach on leads: ${String(err)}`);
    }
  }

  async history(agent: LeadAgent) {
    let query = this.db
      .from('outreach_emails')
      .select(
        'id, recipient_type, to_email, to_name, template, subject, status, error, created_at, sender:affiliates!affiliate_id(first_name, last_name)',
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (!this.isManager(agent)) query = query.eq('affiliate_id', agent.id);
    const { data, error } = await query;
    if (error) {
      if (isMissingSchema(error)) return { emails: [] };
      this.fail('Outreach history failed', error);
    }
    return {
      emails: ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
        (row) => {
          const { sender, ...rest } = row;
          const person = sender as {
            first_name: string | null;
            last_name: string | null;
          } | null;
          return {
            ...rest,
            sender_name: person
              ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() ||
                null
              : null,
          };
        },
      ),
    };
  }

  // ─── Unsubscribe (public) ────────────────────────────────────────────────

  /** Adds the address to the suppression list. Needs the signed token from the email's link. */
  async unsubscribe(
    email: unknown,
    token: unknown,
  ): Promise<{ unsubscribed: true }> {
    if (
      typeof email !== 'string' ||
      !EMAIL_RE.test(email) ||
      !verifyUnsubscribeToken(email, token)
    ) {
      bad('This unsubscribe link is not valid.');
    }
    const { error } = await this.db
      .from('email_suppressions')
      .upsert(
        { email: normalizeEmailKey(email), reason: 'unsubscribed' },
        { onConflict: 'email', ignoreDuplicates: true },
      );
    if (error) this.fail('Unsubscribe failed', error);
    return { unsubscribed: true };
  }
}
