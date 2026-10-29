import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { MailService } from '../mail/mail.service';
import { PromoterAccessService } from '../promoter-team/promoter-access.service';
import { settlePreviousCheckout } from '../common/previous-checkout';
import { syncEventAfterPayment } from '../payments/event-payment-sync';
import {
  InvoiceKind,
  KIND_CONFIG,
  PaymentRuleError,
  parseAmountCents,
  parseKind,
  parseMethod,
  planPayment,
  planVoid,
  toCents,
} from './invoice-payment-rules';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  zelle: 'Zelle',
  bank_transfer: 'Bank transfer',
  card_in_person: 'Card (in person)',
  other: 'Other',
};

/** The account column that links each invoice type to its issuer. */
const ACCOUNT_LINK: Record<
  Exclude<InvoiceKind, 'owner'>,
  { accountTable: string; column: string }
> = {
  vendor: { accountTable: 'vendor_accounts', column: 'vendor_account_id' },
  artist: { accountTable: 'artist_accounts', column: 'artist_account_id' },
  promoter: {
    accountTable: 'promoter_accounts',
    column: 'promoter_account_id',
  },
};

export interface RecordPaymentInput {
  amount?: unknown;
  method?: unknown;
  paidOn?: unknown;
  reference?: unknown;
  notes?: unknown;
  sendReceipt?: unknown;
}

@Injectable()
export class InvoicePaymentsService {
  private readonly logger = new Logger(InvoicePaymentsService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly smsNotifications: SmsNotificationsService,
    private readonly mailService: MailService,
    private readonly access: PromoterAccessService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  /** Promoter team members act for the promoter account's creator; everyone else acts as themselves. */
  private async actor(kind: InvoiceKind, userId: string): Promise<string> {
    return kind === 'promoter'
      ? this.access.resolveUserId(userId, 'write')
      : userId;
  }

  /** Loads an invoice only if it belongs to the signed-in user; anything else looks like it does not exist. */
  private async loadOwnInvoice(
    kind: InvoiceKind,
    invoiceId: string,
    userId: string,
  ): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from(KIND_CONFIG[kind].table)
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (kind === 'owner') {
      if (invoice.owner_id !== userId) {
        throw new NotFoundException('Invoice not found');
      }
      return invoice;
    }

    const link = ACCOUNT_LINK[kind];
    const accountId = invoice[link.column];
    if (!accountId) throw new NotFoundException('Invoice not found');
    const { data: account } = await admin
      .from(link.accountTable)
      .select('id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!account) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async list(kindInput: string, invoiceId: string, userId: string) {
    const kind = this.requireKind(kindInput);
    const actor = await this.actor(kind, userId);
    await this.loadOwnInvoice(kind, invoiceId, actor);
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('invoice_payments')
      .select('*')
      .eq('invoice_type', kind)
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });
    if (error) {
      this.logger.error(`Listing payments failed: ${error.message}`);
      throw new ServiceUnavailableException('Could not load payments.');
    }
    return data ?? [];
  }

  async record(
    kindInput: string,
    invoiceId: string,
    userId: string,
    input: RecordPaymentInput,
  ) {
    const kind = this.requireKind(kindInput);
    const actor = await this.actor(kind, userId);

    const amountCents = parseAmountCents(input.amount);
    if (amountCents === null) {
      throw new BadRequestException(
        'Enter a payment amount greater than $0, with at most two decimals.',
      );
    }
    const method = parseMethod(input.method);
    if (!method) throw new BadRequestException('Choose how it was paid.');
    const paidOn = this.parsePaidOn(input.paidOn);
    const reference = this.cleanText(input.reference, 120);
    const notes = this.cleanText(input.notes, 500);

    const invoice = await this.loadOwnInvoice(kind, invoiceId, actor);
    const config = KIND_CONFIG[kind];
    const admin = this.supabaseService.getAdminClient();

    // An open checkout page must not be payable once the invoice has been (partly) paid by hand,
    // and a bank payment already in flight blocks the manual one.
    if (config.hasCheckoutSession && this.stripe) {
      await settlePreviousCheckout(
        this.stripe,
        invoice.stripe_checkout_session_id,
        async (sessionId, paymentIntentId) => {
          await admin
            .from(config.table)
            .update({
              status: 'processing',
              stripe_payment_intent_id: paymentIntentId,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_checkout_session_id', sessionId)
            .neq('status', 'paid');
        },
      );
    }

    let plan;
    try {
      plan = planPayment(kind, invoice, amountCents);
    } catch (err) {
      if (err instanceof PaymentRuleError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const { data: payment, error: insertError } = await admin
      .from('invoice_payments')
      .insert({
        invoice_type: kind,
        invoice_id: invoiceId,
        amount: amountCents / 100,
        method,
        paid_on: paidOn,
        reference,
        notes,
        recorded_by: userId,
      })
      .select('*')
      .single();
    if (insertError || !payment) {
      this.logger.error(`Saving payment failed: ${insertError?.message}`);
      throw new ServiceUnavailableException(
        'Could not save the payment. Nothing was changed.',
      );
    }

    const updated = await this.updateInvoice(kind, invoice, plan, {
      ...(plan.fullyPaid
        ? { [config.paidAtColumn]: new Date().toISOString() }
        : {}),
    });
    if (!updated) {
      await admin.from('invoice_payments').delete().eq('id', payment.id);
      throw new ConflictException(
        'This invoice changed while you were recording the payment. Reload it and try again.',
      );
    }

    await this.afterPayment(kind, invoice, plan);

    if (input.sendReceipt === true) {
      await this.sendReceipt(invoice, {
        amount: amountCents / 100,
        method,
        paidOn,
        reference,
        balanceDue: plan.amount_due,
      });
    }

    this.logger.log(
      `Manual payment of ${amountCents} cents recorded on ${kind} invoice ${invoiceId} by ${userId}`,
    );
    return {
      payment,
      invoice: {
        status: plan.status,
        amount_paid: plan.amount_paid,
        amount_due: plan.amount_due,
      },
    };
  }

  async voidPayment(paymentId: string, userId: string, reasonInput: unknown) {
    const reason = this.cleanText(reasonInput, 200);
    if (!reason) throw new BadRequestException('Give a reason for voiding.');

    const admin = this.supabaseService.getAdminClient();
    const { data: payment } = await admin
      .from('invoice_payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();
    const kind = payment ? parseKind(payment.invoice_type) : null;
    if (!payment || !kind) throw new NotFoundException('Payment not found');

    const actor = await this.actor(kind, userId);
    const invoice = await this.loadOwnInvoice(kind, payment.invoice_id, actor);
    if (payment.voided_at) {
      throw new ConflictException('This payment is already voided.');
    }

    // Claim the void first so two requests cannot both subtract the same payment.
    const { data: claimed } = await admin
      .from('invoice_payments')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: userId,
        void_reason: reason,
      })
      .eq('id', paymentId)
      .is('voided_at', null)
      .select('id');
    if (!claimed?.length) {
      throw new ConflictException('This payment is already voided.');
    }

    const plan = planVoid(kind, invoice, toCents(payment.amount));
    const keepStatus = invoice.status === 'cancelled';
    const updated = await this.updateInvoice(
      kind,
      invoice,
      { ...plan, status: keepStatus ? invoice.status : plan.status },
      { [KIND_CONFIG[kind].paidAtColumn]: null },
    );
    if (!updated) {
      await admin
        .from('invoice_payments')
        .update({ voided_at: null, voided_by: null, void_reason: null })
        .eq('id', paymentId);
      throw new ConflictException(
        'This invoice changed while you were voiding the payment. Reload it and try again.',
      );
    }

    this.logger.log(
      `Manual payment ${paymentId} voided on ${kind} invoice ${payment.invoice_id} by ${userId}`,
    );
    return {
      invoice: {
        status: keepStatus ? invoice.status : plan.status,
        amount_paid: plan.amount_paid,
        amount_due: plan.amount_due,
      },
      // Linked events and bookings keep the status they got from the payment; the user should review them.
      reviewLinkedStatus: kind === 'owner' ? !!invoice.event_id : true,
    };
  }

  /** Writes the new amounts, but only if the invoice still has the amount paid we read (guards against a payment landing in between). */
  private async updateInvoice(
    kind: InvoiceKind,
    invoice: any,
    plan: { amount_paid: number; amount_due: number; status: string },
    extra: Record<string, unknown>,
  ): Promise<boolean> {
    let query = this.supabaseService
      .getAdminClient()
      .from(KIND_CONFIG[kind].table)
      .update({
        status: plan.status,
        amount_paid: plan.amount_paid,
        amount_due: plan.amount_due,
        ...extra,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);
    query =
      invoice.amount_paid === null || invoice.amount_paid === undefined
        ? query.is('amount_paid', null)
        : query.eq('amount_paid', invoice.amount_paid);
    const { data, error } = await query.select('id');
    if (error) {
      this.logger.error(`Updating invoice failed: ${error.message}`);
      return false;
    }
    return !!data?.length;
  }

  /** Mirrors what an online payment does to the linked event or booking. */
  private async afterPayment(
    kind: InvoiceKind,
    invoice: any,
    plan: { amount_paid: number; fullyPaid: boolean },
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    try {
      if (kind === 'owner') {
        await syncEventAfterPayment(
          admin,
          this.logger,
          invoice.event_id,
          plan.amount_paid,
          plan.fullyPaid,
        );
      } else if (kind === 'vendor') {
        if (plan.fullyPaid && invoice.vendor_booking_id) {
          await admin
            .from('vendor_bookings')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', invoice.vendor_booking_id);
        }
      } else {
        await admin
          .from(kind === 'artist' ? 'artist_bookings' : 'promoter_bookings')
          .update({
            status: 'deposit_paid',
            updated_at: new Date().toISOString(),
          })
          .eq(
            kind === 'artist' ? 'artist_invoice_id' : 'promoter_invoice_id',
            invoice.id,
          );
      }
    } catch (err) {
      // The payment is already recorded; a stale booking status must not undo it.
      this.logger.warn(
        `Could not update the linked ${kind} booking after a manual payment: ${(err as Error).message}`,
      );
    }
  }

  private async sendReceipt(
    invoice: any,
    details: {
      amount: number;
      method: string;
      paidOn: string;
      reference: string | null;
      balanceDue: number;
    },
  ): Promise<void> {
    const clientName = invoice.client_name || 'Valued Client';
    const invoiceNumber = invoice.invoice_number || 'your invoice';
    try {
      await this.smsNotifications.paymentReceived(
        invoice.client_phone ?? null,
        clientName,
        details.amount,
        `invoice ${invoiceNumber}`,
      );
    } catch {
      // A receipt problem must never undo a recorded payment.
    }
    if (invoice.client_email) {
      await this.mailService.sendManualPaymentReceipt({
        toEmail: invoice.client_email,
        clientName,
        invoiceNumber,
        amount: details.amount,
        methodLabel: METHOD_LABELS[details.method] ?? details.method,
        paidOn: details.paidOn,
        balanceDue: details.balanceDue,
        reference: details.reference,
      });
    }
  }

  private requireKind(value: string): InvoiceKind {
    const kind = parseKind(value);
    if (!kind) throw new NotFoundException('Unknown invoice type');
    return kind;
  }

  /** A calendar date, not in the future (one day of slack covers time zones). */
  private parsePaidOn(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Enter the date the payment was received.');
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Enter a valid payment date.');
    }
    const limit = Date.now() + 24 * 60 * 60 * 1000;
    if (date.getTime() > limit) {
      throw new BadRequestException(
        'The payment date cannot be in the future.',
      );
    }
    return value;
  }

  private cleanText(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text ? text.slice(0, max) : null;
  }
}
