import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  // ─── Event-day reminders — runs at 8 AM CDT (13:00 UTC) daily ─────────────
  // Sends an email to the client for any event happening TODAY
  @Cron('0 13 * * *')
  async sendEventDayReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: events, error } = await admin
      .from('event')
      .select('id, name, date, start_time, contact_name, contact_email, venue_id, venues(name, address)')
      .gte('date', todayStart.toISOString())
      .lte('date', todayEnd.toISOString())
      .not('contact_email', 'is', null);

    if (error) {
      this.logger.error('Event-day reminders query failed', error.message);
      return;
    }

    this.logger.log(`Event-day reminders: ${events?.length ?? 0} event(s) today`);

    for (const event of events ?? []) {
      try {
        const venueName = (event.venues as any)?.name ?? 'the venue';
        const venueAddress = (event.venues as any)?.address ?? '';
        await this.mailService.sendReminderEmail({
          toEmail: event.contact_email,
          toName:  event.contact_name ?? 'Guest',
          subject: `Your event is TODAY — ${event.name}`,
          body:    `This is a reminder that your event "<strong>${event.name}</strong>" is scheduled for today.\n\nLocation: ${venueName}${venueAddress ? ', ' + venueAddress : ''}\nTime: ${event.start_time ?? 'See your booking details'}\n\nWe look forward to hosting you!`,
        });
        this.logger.log(`Event-day reminder sent → ${event.contact_email} (event: ${event.id})`);
      } catch (err: any) {
        this.logger.error(`Failed to send event-day reminder for event ${event.id}`, err.message);
      }
    }
  }

  // ─── 3-day advance reminder — runs at 9 AM CDT (14:00 UTC) daily ──────────
  // Sends a reminder 3 days before the event
  @Cron('0 14 * * *')
  async sendThreeDayReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const targetStart = new Date();
    targetStart.setDate(targetStart.getDate() + 3);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetStart);
    targetEnd.setHours(23, 59, 59, 999);

    const { data: events, error } = await admin
      .from('event')
      .select('id, name, date, start_time, contact_name, contact_email, venues(name, address)')
      .gte('date', targetStart.toISOString())
      .lte('date', targetEnd.toISOString())
      .not('contact_email', 'is', null);

    if (error) {
      this.logger.error('3-day reminder query failed', error.message);
      return;
    }

    this.logger.log(`3-day reminders: ${events?.length ?? 0} event(s) in 3 days`);

    for (const event of events ?? []) {
      try {
        const venueName = (event.venues as any)?.name ?? 'the venue';
        const eventDate = new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        await this.mailService.sendReminderEmail({
          toEmail: event.contact_email,
          toName:  event.contact_name ?? 'Guest',
          subject: `Reminder: Your event is in 3 days — ${event.name}`,
          body:    `Just a heads up — your event "<strong>${event.name}</strong>" is coming up in 3 days on <strong>${eventDate}</strong>.\n\nLocation: ${venueName}\nTime: ${event.start_time ?? 'See your booking details'}\n\nIf you have any questions, please don't hesitate to reach out.`,
        });
        this.logger.log(`3-day reminder sent → ${event.contact_email} (event: ${event.id})`);
      } catch (err: any) {
        this.logger.error(`Failed to send 3-day reminder for event ${event.id}`, err.message);
      }
    }
  }

  // ─── Overdue invoice reminders — runs at 10 AM CDT (15:00 UTC) daily ──────
  // Sends a reminder for any invoice that is past its due date and still unpaid
  @Cron('0 15 * * *')
  async sendOverdueInvoiceReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();

    const { data: invoices, error } = await admin
      .from('invoices')
      .select('id, invoice_number, total_amount, due_date, client_name, client_email, owner_account_id')
      .in('status', ['sent', 'partial'])
      .lt('due_date', now)
      .not('client_email', 'is', null);

    if (error) {
      this.logger.error('Overdue invoice query failed', error.message);
      return;
    }

    this.logger.log(`Overdue invoice reminders: ${invoices?.length ?? 0} invoice(s) overdue`);

    for (const invoice of invoices ?? []) {
      try {
        const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const amount = typeof invoice.total_amount === 'number'
          ? `$${invoice.total_amount.toFixed(2)}`
          : invoice.total_amount;
        await this.mailService.sendReminderEmail({
          toEmail: invoice.client_email,
          toName:  invoice.client_name ?? 'Client',
          subject: `Payment reminder — Invoice #${invoice.invoice_number}`,
          body:    `This is a friendly reminder that invoice <strong>#${invoice.invoice_number}</strong> for <strong>${amount}</strong> was due on <strong>${dueDate}</strong> and remains unpaid.\n\nPlease log in to your client portal to make a payment at your earliest convenience. If you have any questions, please contact us.`,
        });
        this.logger.log(`Overdue reminder sent → ${invoice.client_email} (invoice: ${invoice.id})`);
      } catch (err: any) {
        this.logger.error(`Failed to send overdue reminder for invoice ${invoice.id}`, err.message);
      }
    }
  }

  // ─── Deposit due reminders — runs at 11 AM CDT (16:00 UTC) daily ──────────
  // Warns clients whose deposit is not confirmed and event is within 7 days
  @Cron('0 16 * * *')
  async sendDepositDueReminders(): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const today = new Date().toISOString();
    const deadline = sevenDaysOut.toISOString();

    const { data: events, error } = await admin
      .from('event')
      .select('id, name, date, contact_name, contact_email, client_status')
      .gte('date', today)
      .lte('date', deadline)
      .in('client_status', ['pending', 'contacted_by_phone', 'walkthrough_completed'])
      .not('contact_email', 'is', null);

    if (error) {
      this.logger.error('Deposit reminder query failed', error.message);
      return;
    }

    this.logger.log(`Deposit reminders: ${events?.length ?? 0} event(s) with unpaid deposits in 7 days`);

    for (const event of events ?? []) {
      try {
        const eventDate = new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        await this.mailService.sendReminderEmail({
          toEmail: event.contact_email,
          toName:  event.contact_name ?? 'Guest',
          subject: `Deposit reminder — ${event.name} on ${eventDate}`,
          body:    `Your event "<strong>${event.name}</strong>" is coming up on <strong>${eventDate}</strong>.\n\nOur records show that your deposit has not yet been received. To confirm your booking, please submit your deposit as soon as possible.\n\nIf you have already submitted payment, please disregard this message.`,
        });
        this.logger.log(`Deposit reminder sent → ${event.contact_email} (event: ${event.id})`);
      } catch (err: any) {
        this.logger.error(`Failed to send deposit reminder for event ${event.id}`, err.message);
      }
    }
  }
}
