import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import {
  applicationFeeCents,
  chargeTotalWithProcessing,
  normalizePayMethod,
  bankTotalForCardTotalCents,
  PayMethod,
  payLaterSurchargeCents,
  paymentMethodTypesFor,
  processingRateLabel,
} from '../payments/platform-fee';
import {
  applyCredit,
  creditCentsFor,
  depositRemainingCents,
  hasDeposit,
  normalizePayAmount,
  validateDeposit,
} from '../payments/invoice-deposit';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import Stripe from 'stripe';
import { settlePreviousCheckout } from '../common/previous-checkout';
import { isBilledTo } from './invoice-recipient';
import * as nodemailer from 'nodemailer';
import {
  CreateArtistInvoiceDto,
  UpdateArtistInvoiceDto,
  ArtistInvoiceItemDto,
} from './dto/artist-invoice.dto';

const APP_FEE_RATE = 0.03; // 3% platform fee — artist-to-client invoices

@Injectable()
export class ArtistInvoicesService {
  private readonly logger = new Logger(ArtistInvoicesService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
    this.stripe = new Stripe(secretKey);
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://eventecos.com',
    );
  }

  // ─── Invoice number generation ────────────────────────────────────────────

  private async generateInvoiceNumber(): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const year = new Date().getFullYear();
    const { count } = await admin
      .from('artist_invoices')
      .select('*', { count: 'exact', head: true });
    const seq = String((count ?? 0) + 1).padStart(5, '0');
    return `AINV-${year}-${seq}`;
  }

  private calculateTotals(
    items: Pick<ArtistInvoiceItemDto, 'quantity' | 'unit_price'>[],
    taxRate: number,
    discountAmount: number,
  ) {
    const subtotal = items.reduce(
      (sum, i) => sum + i.quantity * i.unit_price,
      0,
    );
    const taxAmount = subtotal * (taxRate / 100);
    const baseAmount = Math.max(0, subtotal + taxAmount - discountAmount);
    // Platform fee is charged to the artist (deducted from payout via application_fee_amount).
    // Stripe processing fee is still passed through to the client.
    const platformFeeAmount = Math.round(baseAmount * APP_FEE_RATE * 100) / 100;
    const totalAmount =
      chargeTotalWithProcessing(Math.round(baseAmount * 100)) / 100;
    const processingFeeAmount =
      Math.round((totalAmount - baseAmount) * 100) / 100;
    return {
      subtotal,
      taxAmount,
      baseAmount,
      platformFeeAmount,
      processingFeeAmount,
      totalAmount,
      amountDue: totalAmount,
    };
  }

  // ─── Artist account helper ────────────────────────────────────────────────

  async getArtistAccountId(userId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data)
      throw new ForbiddenException('No artist account found for this user');
    return data.id;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async createInvoice(userId: string, dto: CreateArtistInvoiceDto) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);
    const invoiceNumber = await this.generateInvoiceNumber();
    const taxRate = dto.tax_rate ?? 0;
    const discountAmount = dto.discount_amount ?? 0;
    const { subtotal, taxAmount, totalAmount, amountDue } =
      this.calculateTotals(dto.items, taxRate, discountAmount);
    const depositError = validateDeposit({
      deposit_amount: dto.deposit_amount,
      balance_due_date: dto.balance_due_date,
      due_date: dto.due_date,
      total_amount: totalAmount,
    });
    if (depositError) throw new BadRequestException(depositError);

    const { data: invoice, error: invErr } = await admin
      .from('artist_invoices')
      .insert({
        artist_account_id: artistAccountId,
        invoice_number: invoiceNumber,
        client_name: dto.client_name,
        client_email: dto.client_email,
        client_phone: dto.client_phone ?? null,
        issue_date: dto.issue_date,
        due_date: dto.due_date,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        subtotal,
        total_amount: totalAmount,
        amount_due: amountDue,
        amount_paid: 0,
        notes: dto.notes ?? null,
        terms: dto.terms ?? null,
        status: 'draft',
        // Only written when a deposit is set so invoices without one never touch the new columns.
        ...(dto.deposit_amount != null
          ? {
              deposit_amount: dto.deposit_amount,
              balance_due_date: dto.balance_due_date ?? null,
            }
          : {}),
      })
      .select()
      .single();

    if (invErr || !invoice)
      throw new Error(invErr?.message ?? 'Failed to create invoice');

    if (dto.items.length > 0) {
      const lineItems = dto.items.map((item) => ({
        artist_invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
      }));
      const { error: itemsErr } = await admin
        .from('artist_invoice_items')
        .insert(lineItems);
      if (itemsErr)
        this.logger.error('Failed to insert invoice items', itemsErr);
    }

    return this.getInvoice(userId, invoice.id);
  }

  async listInvoices(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    let artistAccountId: string;
    try {
      artistAccountId = await this.getArtistAccountId(userId);
    } catch {
      return [];
    }

    const { data, error } = await admin
      .from('artist_invoices')
      .select('*, artist_invoice_items(*)')
      .eq('artist_account_id', artistAccountId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getInvoice(userId: string, invoiceId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Fetch the invoice first (no artist filter yet)
    const { data, error } = await admin
      .from('artist_invoices')
      .select(
        '*, artist_invoice_items(*), artist_accounts(artist_name, stage_name, booking_email, booking_phone, location)',
      )
      .eq('id', invoiceId)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Invoice not found');

    // Allow if caller is the artist who owns this invoice
    const { data: artistAccount } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (artistAccount && artistAccount.id === data.artist_account_id) {
      return data;
    }

    // Allow if caller is a promoter whose account is linked to a booking that has this invoice
    // (the promoter is effectively the client being billed)
    const { data: promoterAccount } = await admin
      .from('promoter_accounts')
      .select('id, email')
      .eq('user_id', userId)
      .maybeSingle();
    if (promoterAccount && data.status !== 'draft') {
      const { data: booking } = await admin
        .from('promoter_bookings')
        .select('id')
        .eq('promoter_account_id', promoterAccount.id)
        .eq('artist_account_id', data.artist_account_id)
        .maybeSingle();
      const { data: user } = await admin
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      if (
        booking &&
        isBilledTo(data.client_email, [promoterAccount.email, user?.email])
      ) {
        return data;
      }
    }

    throw new ForbiddenException('Access denied');
    return data;
  }

  async updateInvoice(
    userId: string,
    invoiceId: string,
    dto: UpdateArtistInvoiceDto,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data: existing } = await admin
      .from('artist_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('artist_account_id', artistAccountId)
      .single();

    if (!existing) throw new NotFoundException('Invoice not found');

    if (
      dto.deposit_amount !== undefined ||
      dto.balance_due_date !== undefined ||
      dto.due_date !== undefined
    ) {
      const depositError = validateDeposit({
        deposit_amount:
          dto.deposit_amount !== undefined
            ? dto.deposit_amount
            : existing.deposit_amount,
        balance_due_date:
          dto.balance_due_date !== undefined
            ? dto.balance_due_date
            : existing.balance_due_date,
        due_date: dto.due_date ?? existing.due_date,
        total_amount: Number(existing.total_amount),
      });
      if (depositError) throw new BadRequestException(depositError);
    }

    const { error } = await admin
      .from('artist_invoices')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (error) throw new Error(error.message);
    return this.getInvoice(userId, invoiceId);
  }

  async deleteInvoice(userId: string, invoiceId: string) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { error } = await admin
      .from('artist_invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('artist_account_id', artistAccountId);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  // ─── Line items ───────────────────────────────────────────────────────────

  async addItem(userId: string, invoiceId: string, item: ArtistInvoiceItemDto) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data: invoice } = await admin
      .from('artist_invoices')
      .select('id, tax_rate, discount_amount')
      .eq('id', invoiceId)
      .eq('artist_account_id', artistAccountId)
      .single();
    if (!invoice) throw new NotFoundException('Invoice not found');

    const { error } = await admin.from('artist_invoice_items').insert({
      artist_invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.quantity * item.unit_price,
    });
    if (error) throw new Error(error.message);

    await this.recalcAndSaveInvoiceTotals(
      invoiceId,
      invoice.tax_rate,
      invoice.discount_amount,
    );
    return this.getInvoice(userId, invoiceId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    item: Partial<ArtistInvoiceItemDto>,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data: existing } = await admin
      .from('artist_invoice_items')
      .select(
        '*, artist_invoices!inner(artist_account_id, tax_rate, discount_amount)',
      )
      .eq('id', itemId)
      .single();

    const parentInvoice = existing ? existing.artist_invoices : null;
    if (!existing || parentInvoice?.artist_account_id !== artistAccountId) {
      throw new NotFoundException('Item not found');
    }

    const qty = item.quantity ?? existing.quantity;
    const price = item.unit_price ?? existing.unit_price;

    const { error } = await admin
      .from('artist_invoice_items')
      .update({ ...item, amount: qty * price })
      .eq('id', itemId);
    if (error) throw new Error(error.message);

    await this.recalcAndSaveInvoiceTotals(
      existing.artist_invoice_id,
      parentInvoice.tax_rate,
      parentInvoice.discount_amount,
    );
    return this.getInvoice(userId, existing.artist_invoice_id);
  }

  async deleteItem(userId: string, itemId: string) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data: existing } = await admin
      .from('artist_invoice_items')
      .select(
        'artist_invoice_id, artist_invoices!inner(artist_account_id, tax_rate, discount_amount)',
      )
      .eq('id', itemId)
      .single();

    const parentInvoice = existing ? (existing.artist_invoices as any) : null;
    if (!existing || parentInvoice?.artist_account_id !== artistAccountId) {
      throw new NotFoundException('Item not found');
    }

    await admin.from('artist_invoice_items').delete().eq('id', itemId);
    await this.recalcAndSaveInvoiceTotals(
      existing.artist_invoice_id,
      parentInvoice.tax_rate,
      parentInvoice.discount_amount,
    );
    return { success: true };
  }

  private async recalcAndSaveInvoiceTotals(
    invoiceId: string,
    taxRate: number,
    discountAmount: number,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const { data: items } = await admin
      .from('artist_invoice_items')
      .select('quantity, unit_price')
      .eq('artist_invoice_id', invoiceId);
    const { data: current } = await admin
      .from('artist_invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();

    const { subtotal, taxAmount, totalAmount, amountDue } =
      this.calculateTotals(
        (items ?? []) as { quantity: number; unit_price: number }[],
        Number(taxRate),
        Number(discountAmount),
      );

    await admin
      .from('artist_invoices')
      .update({
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        // With a deposit, payments already received stay credited when items change.
        amount_due:
          current?.deposit_amount != null
            ? Math.max(0, totalAmount - Number(current.amount_paid ?? 0))
            : amountDue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);
  }

  // ─── Send invoice email ───────────────────────────────────────────────────

  async sendInvoice(
    userId: string,
    invoiceId: string,
  ): Promise<{ success: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);
    const { data: artistAccount } = await admin
      .from('artist_accounts')
      .select(
        'stripe_account_id, stripe_connect_status, artist_name, stage_name',
      )
      .eq('id', artistAccountId)
      .single();
    if (
      !artistAccount?.stripe_account_id ||
      artistAccount.stripe_connect_status !== 'active'
    ) {
      throw new BadRequestException(
        'You must connect a Stripe account before sending invoices. Go to your dashboard to set up payouts.',
      );
    }

    const invoice = await this.getInvoice(userId, invoiceId);
    const payUrl = `${this.frontendUrl}/artist-pay/${invoice.public_token}`;
    const artistName =
      invoice.artist_accounts?.stage_name ||
      invoice.artist_accounts?.artist_name ||
      'Your Artist';

    const emailSent = await this.sendInvoiceEmail({
      to: invoice.client_email,
      clientName: invoice.client_name,
      artistName,
      invoiceNumber: invoice.invoice_number,
      totalAmount: invoice.total_amount,
      dueDate: invoice.due_date,
      payUrl,
    });

    if (emailSent) {
      await admin
        .from('artist_invoices')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
    }

    const clientPhone = invoice.client_phone as string | null;
    try {
      if (clientPhone) {
        await this.smsNotifications.vendorInvoiceSent(
          clientPhone,
          invoice.client_name,
          artistName,
          invoice.total_amount,
          payUrl,
        );
      }
    } catch (smsErr: any) {
      this.logger.warn(`Failed to send invoice SMS: ${smsErr?.message}`);
    }

    return { success: emailSent };
  }

  private async sendInvoiceEmail(params: {
    to: string;
    clientName: string;
    artistName: string;
    invoiceNumber: string;
    totalAmount: number;
    dueDate: string;
    payUrl: string;
  }): Promise<boolean> {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP not configured — invoice email not sent.');
      this.logger.log(`[DEV] Invoice email to ${params.to}: ${params.payUrl}`);
      return true;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(this.configService.get<string>('SMTP_PORT', '587')),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const amount = `$${Number(params.totalAmount).toFixed(2)}`;
    const fromAddress = this.configService.get<string>('SMTP_FROM', smtpUser);

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#4f46e5;">Invoice from ${params.artistName}</h2>
        <p>Hi ${params.clientName},</p>
        <p>You have received an invoice <strong>${params.invoiceNumber}</strong> for <strong>${amount}</strong>, due on <strong>${params.dueDate}</strong>.</p>
        <p style="margin:24px 0;">
          <a href="${params.payUrl}"
             style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:16px;">
            View &amp; Pay Invoice
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Powered by DoVenue Suite</p>
      </div>`;

    try {
      await transporter.sendMail({
        from: `"${params.artistName}" <${fromAddress}>`,
        to: params.to,
        subject: `Invoice ${params.invoiceNumber} from ${params.artistName} — ${amount} due`,
        html,
      });
      this.logger.log(`Artist invoice email sent to ${params.to}`);
      return true;
    } catch (err) {
      this.logger.error(
        'Failed to send artist invoice email',
        (err as Error).message,
      );
      return false;
    }
  }

  // ─── Public invoice (no auth) ──────────────────────────────────────────────

  async getPublicInvoice(token: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('artist_invoices')
      .select(
        '*, artist_invoice_items(*), artist_accounts(artist_name, stage_name, booking_email, booking_phone, location, profile_image_url, enable_bnpl)',
      )
      .eq('public_token', token)
      .single();

    if (error || !data) throw new NotFoundException('Invoice not found');

    if (data.status === 'sent') {
      await admin
        .from('artist_invoices')
        .update({ status: 'viewed', updated_at: new Date().toISOString() })
        .eq('id', data.id);
      data.status = 'viewed';
    }

    const { enable_bnpl, ...artistPublic } = data.artist_accounts ?? {};
    const {
      public_token: _tok,
      stripe_checkout_session_id: _sess,
      stripe_payment_intent_id: _pi,
      pending_credit_cents: _pending,
      ...safe
    } = data;
    return {
      ...safe,
      artist_accounts: data.artist_accounts ? artistPublic : null,
      pay_later_available: !!enable_bnpl,
      bank_available: !!enable_bnpl,
      pay_later_surcharge_cents: payLaterSurchargeCents(
        Math.round(Number(data.amount_due) * 100),
      ),
      bank_total_cents: bankTotalForCardTotalCents(
        Math.round(Number(data.amount_due) * 100),
      ),
      ...(hasDeposit(data)
        ? {
            deposit_remaining_cents: depositRemainingCents(data),
            deposit_pay_later_surcharge_cents: payLaterSurchargeCents(
              creditCentsFor(data, 'deposit'),
            ),
            deposit_bank_total_cents: bankTotalForCardTotalCents(
              creditCentsFor(data, 'deposit'),
            ),
          }
        : {}),
    };
  }

  // ─── Stripe Checkout for public invoice payment ────────────────────────────

  async createCheckoutSession(
    token: string,
    payMethodInput: unknown = 'card',
    payAmountInput?: unknown,
  ): Promise<{ url: string; feeCents: number }> {
    const payMethod: PayMethod = normalizePayMethod(payMethodInput, true);
    const payAmount = normalizePayAmount(payAmountInput);
    const admin = this.supabaseService.getAdminClient();

    const { data: invoice, error } = await admin
      .from('artist_invoices')
      .select(
        '*, artist_accounts(stripe_account_id, stripe_connect_status, artist_name, stage_name, enable_bnpl)',
      )
      .eq('public_token', token)
      .single();

    if (error || !invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid')
      throw new ForbiddenException('Invoice is already paid');
    if (invoice.status === 'cancelled')
      throw new ForbiddenException('Invoice has been cancelled');
    if (invoice.status === 'processing')
      throw new ForbiddenException(
        'A bank payment for this invoice is already processing',
      );
    await settlePreviousCheckout(
      this.stripe,
      invoice.stripe_checkout_session_id,
      (sessionId, paymentIntentId) =>
        this.markInvoiceProcessing(sessionId, paymentIntentId),
    );

    // Invoices without a deposit always charge the full amount due.
    const amountCents = creditCentsFor(invoice, payAmount);
    if (amountCents <= 0)
      throw new ForbiddenException('Invoice amount must be greater than zero');
    const isDepositPayment = hasDeposit(invoice) && payAmount === 'deposit';

    const artist = invoice.artist_accounts;
    const hasConnect =
      artist?.stripe_account_id && artist?.stripe_connect_status === 'active';

    if (!hasConnect) {
      throw new BadRequestException(
        'This artist has not connected a Stripe account. Payment cannot be processed until they complete Stripe onboarding.',
      );
    }

    const artistName = artist?.stage_name || artist?.artist_name || 'Artist';
    // Platform fee is 3% of the base (subtotal + tax - discount), NOT of the gross total
    const fullBaseCents = Math.round(
      (Number(invoice.subtotal) +
        Number(invoice.tax_amount) -
        Number(invoice.discount_amount)) *
        100,
    );
    // A deposit carries the same share of the base (and so of the platform fee) as of the total.
    const totalCents = Math.round(Number(invoice.total_amount) * 100);
    const baseCents =
      hasDeposit(invoice) && totalCents > 0
        ? Math.round((fullBaseCents * amountCents) / totalCents)
        : fullBaseCents;
    const platformFeeCents = Math.round(baseCents * APP_FEE_RATE);
    // The client already pays Stripe's fee inside the invoice total; pay-later adds the higher fee as its own line.
    const surchargeCents =
      payMethod === 'pay_later' ? payLaterSurchargeCents(amountCents) : 0;
    // A bank payment drops the baked-in card fee down to the bank fee.
    const chargeCents =
      payMethod === 'bank'
        ? bankTotalForCardTotalCents(amountCents)
        : amountCents;
    const feeCents = applicationFeeCents(
      platformFeeCents,
      Math.max(0, chargeCents - baseCents) + surchargeCents,
    );

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: paymentMethodTypesFor(
        artist?.enable_bnpl,
        payMethod,
        { bankDebit: true },
      ),
      customer_email: invoice.client_email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: chargeCents,
            product_data: {
              name: `${isDepositPayment ? 'Deposit — ' : ''}Invoice ${invoice.invoice_number}`,
              description: `Payment to ${artistName}`,
            },
          },
          quantity: 1,
        },
        ...(surchargeCents > 0
          ? [
              {
                price_data: {
                  currency: 'usd',
                  unit_amount: surchargeCents,
                  product_data: {
                    name: 'Pay-later processing fee',
                    description: `Afterpay / Klarna / Affirm fee (${processingRateLabel('pay_later')})`,
                  },
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      success_url: `${this.frontendUrl}/artist-pay/${token}?paid=true`,
      cancel_url: `${this.frontendUrl}/artist-pay/${token}?canceled=true`,
      metadata: { artist_invoice_id: invoice.id, artist_invoice_token: token },
      client_reference_id: invoice.id,
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: artist.stripe_account_id },
        metadata: { artist_invoice_id: invoice.id },
      },
    });

    await admin
      .from('artist_invoices')
      .update({
        stripe_checkout_session_id: session.id,
        // Lets the webhook credit exactly what this checkout paid (deposit invoices only).
        // A new checkout supersedes the previous payment, so late events for it can no longer match.
        ...(invoice.deposit_amount != null
          ? {
              pending_credit_cents: amountCents,
              stripe_payment_intent_id: null,
            }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    this.logger.log(
      `Artist invoice checkout: ${session.id} for invoice ${invoice.id}`,
    );
    return { url: session.url!, feeCents };
  }

  // ─── Called from webhook when payment succeeds ─────────────────────────────

  /**
   * Credits the in-flight checkout to an invoice that has a deposit.
   * Returns null when it was already credited (webhook + verify can both fire).
   */
  private async creditDepositPayment(
    invoice: any,
    paymentIntentId: string | null,
  ): Promise<{ fullyPaid: boolean; creditedCents: number } | null> {
    const pending = Number(invoice.pending_credit_cents ?? 0);
    if (pending <= 0) return null;
    const admin = this.supabaseService.getAdminClient();
    const credit = applyCredit(invoice, pending);
    const { data: updated } = await admin
      .from('artist_invoices')
      .update({
        status: credit.fullyPaid ? 'paid' : 'sent',
        amount_paid: credit.amount_paid,
        amount_due: credit.amount_due,
        pending_credit_cents: null,
        ...(credit.fullyPaid ? { paid_at: new Date().toISOString() } : {}),
        ...(paymentIntentId
          ? { stripe_payment_intent_id: paymentIntentId }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id)
      .eq('pending_credit_cents', pending)
      .select('id');
    if (!updated?.length) return null;
    return { fullyPaid: credit.fullyPaid, creditedCents: pending };
  }

  private async notifyPayment(
    invoice: any,
    paidAmount: number,
    isDeposit: boolean,
  ) {
    try {
      const artistAccount = invoice.artist_accounts as any;
      const artistPhone: string | null = artistAccount?.booking_phone ?? null;
      const artistName: string =
        artistAccount?.stage_name || artistAccount?.artist_name || 'Artist';
      await this.smsNotifications.vendorInvoicePaid(
        artistPhone,
        artistName,
        invoice.client_name ?? 'Client',
        paidAmount,
      );
      await this.smsNotifications.paymentReceived(
        invoice.client_phone ?? null,
        invoice.client_name ?? 'Valued Client',
        paidAmount,
        `${isDeposit ? 'a deposit on ' : ''}your invoice from ${artistName}`,
      );
    } catch {
      // SMS errors must never break payment processing
    }
  }

  async markInvoicePaidBySession(
    sessionId: string,
    paymentIntentId: string | null,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('artist_invoices')
      .select('*, artist_accounts(artist_name, stage_name, booking_phone)')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();

    if (!invoice) {
      this.logger.warn(
        `No artist invoice found for Stripe session ${sessionId}`,
      );
      return;
    }

    let paidAmount: number = invoice.total_amount;
    let isDeposit = false;
    if (invoice.deposit_amount != null) {
      const credited = await this.creditDepositPayment(
        invoice,
        paymentIntentId,
      );
      if (!credited) return;
      paidAmount = credited.creditedCents / 100;
      isDeposit = !credited.fullyPaid;
    } else {
      await admin
        .from('artist_invoices')
        .update({
          status: 'paid',
          amount_paid: invoice.total_amount,
          amount_due: 0,
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);
    }

    // Update linked booking status if exists
    await admin
      .from('artist_bookings')
      .update({ status: 'deposit_paid', updated_at: new Date().toISOString() })
      .eq('artist_invoice_id', invoice.id);

    this.logger.log(
      `Artist invoice ${invoice.id} payment recorded via session ${sessionId}`,
    );

    await this.notifyPayment(invoice, paidAmount, isDeposit);
  }

  // ─── ACH delayed payment handlers ─────────────────────────────────────────

  async markInvoiceProcessing(
    sessionId: string,
    paymentIntentId: string | null,
  ) {
    const admin = this.supabaseService.getAdminClient();
    await admin
      .from('artist_invoices')
      .update({
        status: 'processing',
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_checkout_session_id', sessionId);
    this.logger.log(
      `Artist invoice set to processing via session ${sessionId}`,
    );
  }

  async markInvoicePaidByPaymentIntent(paymentIntentId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('artist_invoices')
      .select('*, artist_accounts(artist_name, stage_name, booking_phone)')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (!invoice) {
      // Typically an extra payment from a second checkout that the invoice no longer points to.
      this.logger.warn(
        `Artist payment ${paymentIntentId} succeeded but no invoice stores it; check Stripe for a duplicate payment`,
      );
      return;
    }

    let paidAmount: number = invoice.total_amount;
    let isDeposit = false;
    if (invoice.deposit_amount != null) {
      const credited = await this.creditDepositPayment(invoice, null);
      if (!credited) return;
      paidAmount = credited.creditedCents / 100;
      isDeposit = !credited.fullyPaid;
    } else {
      await admin
        .from('artist_invoices')
        .update({
          status: 'paid',
          amount_paid: invoice.total_amount,
          amount_due: 0,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);
    }

    await admin
      .from('artist_bookings')
      .update({ status: 'deposit_paid', updated_at: new Date().toISOString() })
      .eq('artist_invoice_id', invoice.id);

    this.logger.log(
      `Artist invoice ${invoice.id} payment recorded via PaymentIntent ${paymentIntentId}`,
    );

    await this.notifyPayment(invoice, paidAmount, isDeposit);
  }

  async revertProcessingStatus(paymentIntentId: string) {
    const admin = this.supabaseService.getAdminClient();
    await admin
      .from('artist_invoices')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('status', 'processing');
  }

  // ─── Verify payment via Stripe (webhook fallback) ─────────────────────────

  async verifyPayment(
    token: string,
  ): Promise<{ status: string; paid: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('artist_invoices')
      .select('*, artist_accounts(artist_name, stage_name, booking_phone)')
      .eq('public_token', token)
      .maybeSingle();

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') return { status: 'paid', paid: true };
    if (!invoice.stripe_checkout_session_id)
      return { status: invoice.status, paid: false };

    const session = await this.stripe.checkout.sessions.retrieve(
      invoice.stripe_checkout_session_id,
    );
    if (session.payment_status !== 'paid')
      return { status: invoice.status, paid: false };

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

    let paidAmount: number = invoice.total_amount;
    let fullyPaid = true;
    if (invoice.deposit_amount != null) {
      const credited = await this.creditDepositPayment(
        invoice,
        paymentIntentId,
      );
      if (!credited) {
        // The webhook already recorded it; report the current state.
        const { data: fresh } = await admin
          .from('artist_invoices')
          .select('status')
          .eq('id', invoice.id)
          .maybeSingle();
        return {
          status: fresh?.status ?? invoice.status,
          paid: fresh?.status === 'paid',
        };
      }
      paidAmount = credited.creditedCents / 100;
      fullyPaid = credited.fullyPaid;
    } else {
      await admin
        .from('artist_invoices')
        .update({
          status: 'paid',
          amount_paid: invoice.total_amount,
          amount_due: 0,
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);
    }

    await admin
      .from('artist_bookings')
      .update({ status: 'deposit_paid', updated_at: new Date().toISOString() })
      .eq('artist_invoice_id', invoice.id);

    this.logger.log(
      `Artist invoice ${invoice.id} verified and payment recorded (webhook fallback)`,
    );

    await this.notifyPayment(invoice, paidAmount, !fullyPaid);

    return fullyPaid
      ? { status: 'paid', paid: true }
      : { status: 'sent', paid: false };
  }
}
