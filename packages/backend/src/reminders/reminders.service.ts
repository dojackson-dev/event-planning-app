import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { nextPaymentDue } from '../payments/invoice-deposit';

// Days before a due date that clients are reminded (0 = the day it is due).
const DUE_REMINDER_DAYS = [7, 3, 0];

interface InvoiceReminderSource {
  table: string;
  statuses: string[];
  /** Relation to join for the name of whoever is being paid. */
  payeeSelect: string;
  payeeName: (row: any) => string | null;
  payPath: (token: string) => string;
  /** Owner invoices have no separate balance date, so they can be limited by due_date in SQL. */
  singleDueDate: boolean;
}

const INVOICE_REMINDER_SOURCES: InvoiceReminderSource[] = [
  {
    table: 'artist_invoices',
    statuses: ['sent', 'viewed'],
    payeeSelect: 'artist_accounts(stage_name, artist_name)',
    payeeName: (r) =>
      r.artist_accounts?.stage_name || r.artist_accounts?.artist_name || null,
    payPath: (t) => `/artist-pay/${t}`,
    singleDueDate: false,
  },
  {
    table: 'promoter_invoices',
    statuses: ['sent', 'viewed'],
    payeeSelect: 'promoter_accounts(company_name, contact_name)',
    payeeName: (r) =>
      r.promoter_accounts?.company_name ||
      r.promoter_accounts?.contact_name ||
      null,
    payPath: (t) => `/promoter-pay/${t}`,
    singleDueDate: false,
  },
  {
    table: 'vendor_invoices',
    statuses: ['sent', 'viewed'],
    payeeSelect: 'vendor_accounts(business_name)',
    payeeName: (r) => r.vendor_accounts?.business_name || null,
    payPath: (t) => `/pay/${t}`,
    singleDueDate: false,
  },
  {
    table: 'invoices',
    statuses: ['sent', 'partial'],
    payeeSelect: '',
    payeeName: () => null,
    payPath: (t) => `/pay/invoice/${t}`,
    singleDueDate: true,
  },
];

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {}

  // ─── Date helpers ──────────────────────────────────────────────────────────

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /** Full calendar days between dateA and dateB (positive = A is after B) */
  private daysDiff(dateA: string, dateB: string): number {
    const a = new Date(dateA + 'T00:00:00Z').getTime();
    const b = new Date(dateB + 'T00:00:00Z').getTime();
    return Math.round((a - b) / (1000 * 60 * 60 * 24));
  }

  // ─── Helpers to resolve owner account settings ────────────────────────────

  private async getOwnerDefaults(
    admin: any,
    ownerUserIds: string[],
  ): Promise<
    Record<string, { depositDaysBefore: number; finalDaysBefore: number }>
  > {
    if (!ownerUserIds.length) return {};

    const { data: memberships } = await admin
      .from('memberships')
      .select('user_id, owner_account_id')
      .in('user_id', ownerUserIds)
      .eq('role', 'owner')
      .eq('is_active', true);

    const userToAccount: Record<string, string> = {};
    for (const m of memberships ?? []) {
      userToAccount[m.user_id] = m.owner_account_id;
    }

    const accountIds = [...new Set(Object.values(userToAccount))].filter(
      Boolean,
    );
    if (!accountIds.length) return {};

    const { data: accounts } = await admin
      .from('owner_accounts')
      .select(
        'id, default_deposit_due_days_before, default_final_payment_due_days_before',
      )
      .in('id', accountIds);

    const accountDefaults: Record<
      string,
      { depositDaysBefore: number; finalDaysBefore: number }
    > = {};
    for (const acc of accounts ?? []) {
      accountDefaults[acc.id] = {
        depositDaysBefore: acc.default_deposit_due_days_before ?? 14,
        finalDaysBefore: acc.default_final_payment_due_days_before ?? 3,
      };
    }

    // Map user_id → settings
    const result: Record<
      string,
      { depositDaysBefore: number; finalDaysBefore: number }
    > = {};
    for (const [userId, accountId] of Object.entries(userToAccount)) {
      result[userId] = accountDefaults[accountId] ?? {
        depositDaysBefore: 14,
        finalDaysBefore: 3,
      };
    }
    return result;
  }

  // ─── 1. Event-day reminders — 8 AM CDT (13:00 UTC) ───────────────────────
  // Emails the client whose event is TODAY with venue info and start time
  @Cron('0 13 * * *')
  async sendEventDayReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const today = this.today();

    const { data: events, error } = await admin
      .from('event')
      .select(
        'id, name, date, start_time, contact_name, contact_email, venues(name, address)',
      )
      .gte('date', today + 'T00:00:00Z')
      .lte('date', today + 'T23:59:59Z')
      .not('contact_email', 'is', null);

    if (error) {
      this.logger.error('Event-day query failed', error.message);
      return;
    }
    this.logger.log(`Event-day reminders: ${events?.length ?? 0} today`);

    for (const event of events ?? []) {
      try {
        const venueName = (event.venues as any)?.name ?? 'the venue';
        const venueAddress = (event.venues as any)?.address ?? '';
        await this.mailService.sendReminderEmail({
          toEmail: event.contact_email,
          toName: event.contact_name ?? 'Guest',
          subject: `Your event is TODAY — ${event.name}`,
          body: `This is a reminder that your event "<strong>${event.name}</strong>" is scheduled for today.\n\nLocation: ${venueName}${venueAddress ? ', ' + venueAddress : ''}\nTime: ${event.start_time ?? 'See your booking details'}\n\nWe look forward to hosting you!`,
        });
      } catch (err: any) {
        this.logger.error(
          `Event-day reminder failed (event ${event.id})`,
          err.message,
        );
      }
    }
  }

  // ─── 2. 3-day advance reminder — 9 AM CDT (14:00 UTC) ────────────────────
  // Emails clients whose event is exactly 3 days away
  @Cron('0 14 * * *')
  async sendThreeDayReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const target = this.addDays(this.today(), 3);

    const { data: events, error } = await admin
      .from('event')
      .select(
        'id, name, date, start_time, contact_name, contact_email, venues(name, address)',
      )
      .gte('date', target + 'T00:00:00Z')
      .lte('date', target + 'T23:59:59Z')
      .not('contact_email', 'is', null);

    if (error) {
      this.logger.error('3-day reminder query failed', error.message);
      return;
    }
    this.logger.log(`3-day reminders: ${events?.length ?? 0} events`);

    for (const event of events ?? []) {
      try {
        const venueName = (event.venues as any)?.name ?? 'the venue';
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        await this.mailService.sendReminderEmail({
          toEmail: event.contact_email,
          toName: event.contact_name ?? 'Guest',
          subject: `Reminder: Your event is in 3 days — ${event.name}`,
          body: `Just a heads up — your event "<strong>${event.name}</strong>" is coming up in 3 days on <strong>${eventDate}</strong>.\n\nLocation: ${venueName}\nTime: ${event.start_time ?? 'See your booking details'}\n\nIf you have any questions, please don't hesitate to reach out.`,
        });
      } catch (err: any) {
        this.logger.error(
          `3-day reminder failed (event ${event.id})`,
          err.message,
        );
      }
    }
  }

  // ─── 3. Overdue invoice reminders — 10 AM CDT (15:00 UTC) — WEEKLY ───────
  // Sends once per week (on the due date and every 7 days after) until paid.
  // Targets invoices with status 'sent' or 'partial' whose due_date has passed.
  @Cron('0 15 * * *')
  async sendOverdueInvoiceReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const today = this.today();

    const { data: invoices, error } = await admin
      .from('invoices')
      .select(
        'id, invoice_number, total_amount, amount_due, due_date, client_name, client_email',
      )
      .in('status', ['sent', 'partial'])
      .lt('due_date', today)
      .not('client_email', 'is', null);

    if (error) {
      this.logger.error('Overdue invoice query failed', error.message);
      return;
    }

    // Only send on the due date itself and every 7 days after (weekly cadence)
    const toNotify = (invoices ?? []).filter((inv) => {
      const daysOverdue = this.daysDiff(today, inv.due_date.slice(0, 10));
      return daysOverdue > 0 && daysOverdue % 7 === 0;
    });

    this.logger.log(
      `Overdue invoice reminders: ${toNotify.length} invoice(s) hit weekly mark today`,
    );

    for (const invoice of toNotify) {
      try {
        const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const amountDue =
          typeof invoice.amount_due === 'number'
            ? `$${invoice.amount_due.toFixed(2)}`
            : `$${invoice.total_amount?.toFixed(2) ?? '0.00'}`;
        await this.mailService.sendReminderEmail({
          toEmail: invoice.client_email,
          toName: invoice.client_name ?? 'Client',
          subject: `Payment reminder — Invoice #${invoice.invoice_number}`,
          body: `This is a friendly reminder that invoice <strong>#${invoice.invoice_number}</strong> for <strong>${amountDue}</strong> was due on <strong>${dueDate}</strong> and remains unpaid.\n\nPlease log in to your client portal to make a payment at your earliest convenience. If you have any questions, please contact us.`,
        });
      } catch (err: any) {
        this.logger.error(
          `Overdue invoice reminder failed (invoice ${invoice.id})`,
          err.message,
        );
      }
    }
  }

  // ─── 4. Deposit reminder — 11 AM CDT (16:00 UTC) ─────────────────────────
  // Sends 5 days before the deposit is due, based on the owner's settings
  // (default_deposit_due_days_before on owner_accounts, or per-invoice override).
  // Only fires if the deposit hasn't been paid yet.
  @Cron('0 16 * * *')
  async sendDepositReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const today = this.today();
    const lookahead = 60; // fetch events up to 60 days out to cover any days_before window

    // Fetch upcoming events with unpaid deposits
    const { data: events, error: evErr } = await admin
      .from('event')
      .select('id, name, date, contact_name, contact_email, owner_id')
      .or('deposit_paid.is.null,deposit_paid.eq.false')
      .not('contact_email', 'is', null)
      .gte('date', today + 'T00:00:00Z')
      .lte('date', this.addDays(today, lookahead) + 'T23:59:59Z');

    if (evErr) {
      this.logger.error('Deposit reminder event query failed', evErr.message);
      return;
    }
    if (!events?.length) return;

    // Get per-invoice deposit_due_days_before overrides
    const eventIds = events.map((e) => e.id);
    const { data: invoices } = await admin
      .from('invoices')
      .select('event_id, deposit_due_days_before')
      .in('event_id', eventIds)
      .not('deposit_due_days_before', 'is', null);

    const invoiceDepositDays: Record<string, number> = {};
    for (const inv of invoices ?? []) {
      invoiceDepositDays[inv.event_id] = inv.deposit_due_days_before;
    }

    // Get owner defaults
    const ownerUserIds = [
      ...new Set(events.map((e) => e.owner_id).filter(Boolean)),
    ];
    const ownerDefaults = await this.getOwnerDefaults(admin, ownerUserIds);

    // Filter to events whose deposit is due in exactly 5 days
    const targetDepositDue = this.addDays(today, 5);

    const toNotify = events.filter((event) => {
      const daysBefore =
        invoiceDepositDays[event.id] ??
        ownerDefaults[event.owner_id]?.depositDaysBefore ??
        14;
      const depositDueDate = this.addDays(event.date.slice(0, 10), -daysBefore);
      return depositDueDate === targetDepositDue;
    });

    this.logger.log(
      `Deposit reminders: ${toNotify.length} event(s) with deposit due in 5 days`,
    );

    for (const event of toNotify) {
      try {
        const daysBefore =
          invoiceDepositDays[event.id] ??
          ownerDefaults[event.owner_id]?.depositDaysBefore ??
          14;
        const depositDueDate = new Date(
          this.addDays(event.date.slice(0, 10), -daysBefore) + 'T00:00:00Z',
        ).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        await this.mailService.sendReminderEmail({
          toEmail: event.contact_email,
          toName: event.contact_name ?? 'Guest',
          subject: `Deposit due in 5 days — ${event.name}`,
          body: `This is a reminder that your deposit for "<strong>${event.name}</strong>" (scheduled for ${eventDate}) is due by <strong>${depositDueDate}</strong>.\n\nPlease submit your deposit to secure your booking. If you have any questions or have already paid, please disregard this message.`,
        });
      } catch (err: any) {
        this.logger.error(
          `Deposit reminder failed (event ${event.id})`,
          err.message,
        );
      }
    }
  }

  // ─── 5. Final/remaining balance reminders — 12 PM CDT (17:00 UTC) ────────
  // Fires on the day the remaining balance is due, then every 5 days until paid.
  // Due date = event.date - invoice.final_payment_due_days_before
  // For invoices without an event, falls back to invoice.due_date directly.
  @Cron('0 17 * * *')
  async sendFinalPaymentReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const today = this.today();

    // Fetch unpaid/partial invoices with remaining balance
    const { data: invoices, error } = await admin
      .from('invoices')
      .select(
        'id, invoice_number, total_amount, amount_due, due_date, client_name, client_email, event_id, final_payment_due_days_before, owner_id',
      )
      .in('status', ['sent', 'partial'])
      .gt('amount_due', 0)
      .not('client_email', 'is', null);

    if (error) {
      this.logger.error('Final payment query failed', error.message);
      return;
    }
    if (!invoices?.length) return;

    // Fetch event dates for invoices that have an event_id
    const eventIds = invoices.map((i) => i.event_id).filter(Boolean);
    const eventDateById: Record<string, string> = {};
    if (eventIds.length) {
      const { data: events } = await admin
        .from('event')
        .select('id, date')
        .in('id', eventIds);
      for (const ev of events ?? []) {
        eventDateById[ev.id] = ev.date.slice(0, 10);
      }
    }

    // Get owner defaults for final payment days (for invoices without per-invoice setting)
    const ownerUserIds = [
      ...new Set(invoices.map((i) => i.owner_id).filter(Boolean)),
    ];
    const ownerDefaults = await this.getOwnerDefaults(admin, ownerUserIds);

    const toNotify: Array<{
      invoice: any;
      daysOverdue: number;
      finalDueDate: string;
    }> = [];

    for (const invoice of invoices) {
      let finalDueDate: string | null = null;

      if (invoice.event_id && eventDateById[invoice.event_id]) {
        const eventDate = eventDateById[invoice.event_id];
        const daysBefore =
          invoice.final_payment_due_days_before ??
          ownerDefaults[invoice.owner_id]?.finalDaysBefore ??
          3;
        finalDueDate = this.addDays(eventDate, -daysBefore);
      } else if (invoice.due_date) {
        // Standalone invoice — use the invoice due_date directly
        finalDueDate = invoice.due_date.slice(0, 10);
      }

      if (!finalDueDate) continue;

      const daysOverdue = this.daysDiff(today, finalDueDate);

      // Send on due date (day 0) and every 5 days after
      if (daysOverdue >= 0 && daysOverdue % 5 === 0) {
        toNotify.push({ invoice, daysOverdue, finalDueDate });
      }
    }

    this.logger.log(
      `Final payment reminders: ${toNotify.length} invoice(s) to notify today`,
    );

    for (const { invoice, daysOverdue, finalDueDate } of toNotify) {
      try {
        const amountDue =
          typeof invoice.amount_due === 'number'
            ? `$${invoice.amount_due.toFixed(2)}`
            : `$${invoice.total_amount?.toFixed(2) ?? '0.00'}`;
        const dueDateFormatted = new Date(
          finalDueDate + 'T00:00:00Z',
        ).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        const subject =
          daysOverdue === 0
            ? `Final payment due today — Invoice #${invoice.invoice_number}`
            : `Final payment ${daysOverdue} days overdue — Invoice #${invoice.invoice_number}`;

        const intro =
          daysOverdue === 0
            ? `Your remaining balance of <strong>${amountDue}</strong> for invoice <strong>#${invoice.invoice_number}</strong> is due today (<strong>${dueDateFormatted}</strong>).`
            : `Your remaining balance of <strong>${amountDue}</strong> for invoice <strong>#${invoice.invoice_number}</strong> was due on <strong>${dueDateFormatted}</strong> and is now <strong>${daysOverdue} days overdue</strong>.`;

        await this.mailService.sendReminderEmail({
          toEmail: invoice.client_email,
          toName: invoice.client_name ?? 'Client',
          subject,
          body: `${intro}\n\nPlease log in to your client portal to complete your payment. If you have already paid or have any questions, please contact us directly.`,
        });
      } catch (err: any) {
        this.logger.error(
          `Final payment reminder failed (invoice ${invoice.id})`,
          err.message,
        );
      }
    }
  }

  // ─── 6. Invoice due-date reminders — 10:30 AM CDT (15:30 UTC) ─────────────
  // Texts and emails the client 7 days out, 3 days out and on the day a payment
  // is due. With a deposit, the deposit date applies until the deposit is paid and
  // the balance date after. Covers artist, promoter, vendor and owner invoices.
  @Cron('30 15 * * *')
  async sendInvoiceDueReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const today = this.today();
    for (const source of INVOICE_REMINDER_SOURCES) {
      try {
        await this.remindForSource(admin, source, today);
      } catch (err: any) {
        this.logger.error(
          `Invoice due reminders failed for ${source.table}`,
          err?.message,
        );
      }
    }
  }

  private async remindForSource(
    admin: any,
    source: InvoiceReminderSource,
    today: string,
  ): Promise<void> {
    let query = admin
      .from(source.table)
      .select(source.payeeSelect ? `*, ${source.payeeSelect}` : '*')
      .in('status', source.statuses)
      .gt('amount_due', 0);
    if (source.singleDueDate) query = query.gte('due_date', today);

    const { data: invoices, error } = await query;
    if (error) {
      this.logger.error(
        `Due reminder query failed for ${source.table}`,
        error.message,
      );
      return;
    }

    const due = (invoices ?? []).flatMap((invoice: any) => {
      const next = nextPaymentDue(invoice);
      if (!next.date) return [];
      const daysOut = this.daysDiff(next.date.slice(0, 10), today);
      return DUE_REMINDER_DAYS.includes(daysOut)
        ? [{ invoice, next, daysOut }]
        : [];
    });
    if (!due.length) return;

    // Owner invoices name the business via the owner account.
    const ownerNames: Record<string, string> = {};
    if (source.table === 'invoices') {
      const ownerIds = [
        ...new Set(due.map((d) => d.invoice.owner_id).filter(Boolean)),
      ];
      if (ownerIds.length) {
        const { data: owners } = await admin
          .from('owner_accounts')
          .select('primary_owner_id, business_name')
          .in('primary_owner_id', ownerIds);
        for (const o of owners ?? []) {
          ownerNames[o.primary_owner_id] = o.business_name;
        }
      }
    }

    this.logger.log(
      `Invoice due reminders (${source.table}): ${due.length} to send`,
    );

    const baseUrl = process.env.FRONTEND_URL || 'https://eventecos.com';
    for (const { invoice, next, daysOut } of due) {
      try {
        const payee =
          source.table === 'invoices'
            ? (ownerNames[invoice.owner_id] ?? 'your event venue')
            : (source.payeeName(invoice) ?? 'your provider');
        const payUrl = invoice.public_token
          ? `${baseUrl}${source.payPath(invoice.public_token)}`
          : `${baseUrl}/client-portal/invoices`;
        const amount = next.cents / 100;
        const dueLabel = new Date(next.date + 'T00:00:00Z').toLocaleDateString(
          'en-US',
          { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
        );
        const what =
          next.kind === 'deposit'
            ? 'deposit'
            : next.kind === 'balance'
              ? 'remaining balance'
              : 'payment';
        const clientName = invoice.client_name ?? 'Client';
        const reference = `invoice ${invoice.invoice_number} from ${payee}${next.kind === 'deposit' ? ' (deposit)' : next.kind === 'balance' ? ' (balance)' : ''}`;

        // SMS (skipped by the sender when there is no usable phone number)
        await this.smsNotifications.paymentReminder(
          invoice.client_phone ?? null,
          clientName,
          amount,
          dueLabel,
          reference,
          payUrl,
        );

        // Standalone owner invoices already get a day-of email from the final-payment reminder.
        const dayOfEmailSent =
          source.table === 'invoices' && !invoice.event_id && daysOut === 0;
        if (invoice.client_email && !dayOfEmailSent) {
          const when =
            daysOut === 0
              ? 'is due <strong>today</strong>'
              : `is due in <strong>${daysOut} days</strong>`;
          await this.mailService.sendReminderEmail({
            toEmail: invoice.client_email,
            toName: clientName,
            subject:
              daysOut === 0
                ? `Payment due today — Invoice #${invoice.invoice_number}`
                : `Payment due in ${daysOut} days — Invoice #${invoice.invoice_number}`,
            body: `Your ${what} of <strong>$${amount.toFixed(2)}</strong> for invoice <strong>#${invoice.invoice_number}</strong> from <strong>${payee}</strong> ${when} (${dueLabel}).\n\nPay securely online: <a href="${payUrl}">${payUrl}</a>\n\nIf you have already paid or have any questions, please contact ${payee} directly.`,
          });
        }
      } catch (err: any) {
        this.logger.error(
          `Invoice due reminder failed (${source.table} ${invoice.id})`,
          err?.message,
        );
      }
    }
  }
}
