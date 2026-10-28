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
  normalizePayMethod,
  processingFeeLine,
  paymentMethodTypesFor,
  processingFeeCents,
} from '../payments/platform-fee';
import {
  applyCredit,
  creditCentsFor,
  hasDeposit,
  normalizePayAmount,
  validateDeposit,
} from '../payments/invoice-deposit';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import Stripe from 'stripe';
import { settlePreviousCheckout } from '../common/previous-checkout';
import * as nodemailer from 'nodemailer';
import {
  CreateVendorInvoiceDto,
  UpdateVendorInvoiceDto,
  VendorInvoiceItemDto,
} from './dto/vendor-invoice.dto';

const APP_FEE_RATE = 0.03; // 3% platform fee — vendor-to-client invoices
const OWNER_BOOKING_FEE_RATE = 0.03; // 3% platform fee — owner-to-vendor invoices (waived for Pro/Premium subscribers)

@Injectable()
export class VendorInvoicesService {
  private readonly logger = new Logger(VendorInvoicesService.name);
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

  // ─── Invoice number generation ──────────────────────────────────────────────

  private async generateInvoiceNumber(): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const year = new Date().getFullYear();
    const prefix = `VINV-${year}-`;
    const { data } = await admin
      .from('vendor_invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    let seq = 1;
    if (data?.invoice_number) {
      const match = data.invoice_number.match(/VINV-\d{4}-(\d+)/);
      if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  private calculateTotals(
    items: Pick<VendorInvoiceItemDto, 'quantity' | 'unit_price'>[],
    taxRate: number,
    discountAmount: number,
  ) {
    const subtotal = items.reduce(
      (sum, i) => sum + i.quantity * i.unit_price,
      0,
    );
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
    return { subtotal, taxAmount, totalAmount, amountDue: totalAmount };
  }

  // ─── Vendor account helper ──────────────────────────────────────────────────

  async getVendorAccountId(userId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data)
      throw new ForbiddenException('No vendor account found for this user');
    return data.id;
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async createInvoice(userId: string, dto: CreateVendorInvoiceDto) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);
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
      .from('vendor_invoices')
      .insert({
        vendor_account_id: vendorAccountId,
        invoice_number: invoiceNumber,
        client_name: dto.client_name,
        client_email: dto.client_email ?? null,
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
        vendor_booking_id: dto.vendor_booking_id ?? null,
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
      throw new BadRequestException(
        invErr?.message ?? 'Failed to create invoice',
      );

    if (dto.items.length > 0) {
      const lineItems = dto.items.map((item) => ({
        vendor_invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
      }));
      const { error: itemsErr } = await admin
        .from('vendor_invoice_items')
        .insert(lineItems);
      if (itemsErr)
        this.logger.error('Failed to insert invoice items', itemsErr);
    }

    return this.getInvoice(userId, invoice.id);
  }

  async listInvoices(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data, error } = await admin
      .from('vendor_invoices')
      .select('*, vendor_invoice_items(*)')
      .eq('vendor_account_id', vendorAccountId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async listOwnerBookingInvoices(ownerAccountId: string, ownerUserId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Find all owner vendor_bookings with an agreed_amount
    const { data: bookings } = await admin
      .from('vendor_bookings')
      .select(
        'id, vendor_account_id, event_name, event_date, agreed_amount, booked_by_user_id, vendor_accounts(id, business_name, phone)',
      )
      .eq('owner_account_id', ownerAccountId)
      .not('agreed_amount', 'is', null)
      .gt('agreed_amount', 0);

    if (bookings && bookings.length > 0) {
      // Find which bookings already have an invoice
      const { data: existingInvoices } = await admin
        .from('vendor_invoices')
        .select('vendor_booking_id')
        .eq('owner_account_id', ownerAccountId)
        .eq('invoice_type', 'owner_booking')
        .not('vendor_booking_id', 'is', null);

      const invoicedBookingIds = new Set(
        (existingInvoices ?? []).map((i: any) => i.vendor_booking_id),
      );

      // Auto-create invoices for any bookings that don't have one
      for (const booking of bookings) {
        if (!invoicedBookingIds.has(booking.id)) {
          const vendor = booking.vendor_accounts as any;
          if (!vendor) continue;
          try {
            const userId = booking.booked_by_user_id ?? ownerUserId;
            await this.autoCreateOwnerBookingInvoice(
              booking.id,
              { id: vendor.id, business_name: vendor.business_name },
              {
                vendorAccountId: vendor.id,
                eventName: booking.event_name ?? 'Vendor Event',
                eventDate: booking.event_date,
                agreedAmount: Number(booking.agreed_amount),
              } as any,
              ownerAccountId,
              userId,
            );
            this.logger.log(
              `Backfilled owner booking invoice for booking ${booking.id}`,
            );
          } catch (e) {
            this.logger.warn(
              `Backfill invoice failed for booking ${booking.id}: ${(e as Error).message}`,
            );
          }
        }
      }
    }

    // Return all owner_booking invoices for this owner
    const { data, error } = await admin
      .from('vendor_invoices')
      .select(
        '*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone), vendor_bookings(event_name, event_date, status)',
      )
      .eq('owner_account_id', ownerAccountId)
      .eq('invoice_type', 'owner_booking')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  private async autoCreateOwnerBookingInvoice(
    bookingId: string,
    vendor: { id: string; business_name: string },
    dto: {
      vendorAccountId: string;
      eventName: string;
      eventDate?: string;
      agreedAmount: number;
    },
    ownerAccountId: string,
    ownerUserId: string,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.admin.getUserById(ownerUserId);
    if (userErr || !user?.email)
      throw new Error('Could not resolve owner email');

    const ownerName =
      [user.user_metadata?.first_name, user.user_metadata?.last_name]
        .filter(Boolean)
        .join(' ') || user.email;

    const year = new Date().getFullYear();
    const binvPrefix = `BINV-${year}-`;
    const { data: maxBinv } = await admin
      .from('vendor_invoices')
      .select('invoice_number')
      .like('invoice_number', `${binvPrefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    let binvSeq = 1;
    if (maxBinv?.invoice_number) {
      const match = maxBinv.invoice_number.match(/BINV-\d{4}-(\d+)/);
      if (match) binvSeq = parseInt(match[1], 10) + 1;
    }
    const invoiceNumber = `${binvPrefix}${String(binvSeq).padStart(5, '0')}`;

    const amount = Number(dto.agreedAmount);
    const issueDate = new Date().toISOString().split('T')[0];
    const due = new Date();
    due.setDate(due.getDate() + 14);
    const dueDate = due.toISOString().split('T')[0];

    const { data: invoice, error: invErr } = await admin
      .from('vendor_invoices')
      .insert({
        vendor_account_id: vendor.id,
        invoice_number: invoiceNumber,
        client_name: ownerName,
        client_email: user.email,
        client_phone: user.phone ?? user.user_metadata?.phone ?? null,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal: amount,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: amount,
        amount_due: amount,
        amount_paid: 0,
        status: 'sent',
        invoice_type: 'owner_booking',
        owner_account_id: ownerAccountId,
        vendor_booking_id: bookingId,
        notes: `Auto-generated invoice for vendor booking: ${dto.eventName} on ${dto.eventDate ?? 'TBD'}`,
      })
      .select()
      .single();

    if (invErr || !invoice)
      throw new Error(
        invErr?.message ?? 'Failed to insert owner booking invoice',
      );

    await admin.from('vendor_invoice_items').insert({
      vendor_invoice_id: invoice.id,
      description: `Vendor Services — ${vendor.business_name} · ${dto.eventName} (${dto.eventDate ?? 'TBD'})`,
      quantity: 1,
      unit_price: amount,
      amount,
    });
  }

  async getInvoice(userId: string, invoiceId: string) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data, error } = await admin
      .from('vendor_invoices')
      .select(
        '*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone, city, state, stripe_account_id, stripe_connect_status)',
      )
      .eq('id', invoiceId)
      .eq('vendor_account_id', vendorAccountId)
      .single();

    if (error || !data) throw new NotFoundException('Invoice not found');
    return data;
  }

  /** Owner (payer) fetches a vendor invoice — allows viewing any invoice for dashboard management */
  async getInvoiceAsOwner(ownerAccountId: string, invoiceId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('vendor_invoices')
      .select(
        '*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone, city, state)',
      )
      .eq('id', invoiceId)
      .single();

    if (error || !data) throw new NotFoundException('Invoice not found');

    // Security check: invoice must belong to a booking owned by this owner,
    // OR have this owner's account_id, OR be a vendor invoice the owner manages.
    // For vendor invoices with no owner link (vendor-created), any authenticated owner
    // can view since it's a single-owner platform.
    if (data.vendor_booking_id) {
      const { data: booking } = await admin
        .from('vendor_bookings')
        .select('owner_account_id')
        .eq('id', data.vendor_booking_id)
        .single();
      if (!booking || booking.owner_account_id !== ownerAccountId) {
        throw new ForbiddenException('Access denied');
      }
    }
    // If no vendor_booking_id and no owner_account_id match, still allow owner access
    // (vendor created standalone invoices that the owner manages from the dashboard)

    return data;
  }

  async updateInvoice(
    userId: string,
    invoiceId: string,
    dto: UpdateVendorInvoiceDto,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data: existing } = await admin
      .from('vendor_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('vendor_account_id', vendorAccountId)
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
      .from('vendor_invoices')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (error) throw new Error(error.message);
    return this.getInvoice(userId, invoiceId);
  }

  async deleteInvoice(userId: string, invoiceId: string) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { error } = await admin
      .from('vendor_invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('vendor_account_id', vendorAccountId);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  // ─── Line items ─────────────────────────────────────────────────────────────

  async addItem(userId: string, invoiceId: string, item: VendorInvoiceItemDto) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data: invoice } = await admin
      .from('vendor_invoices')
      .select('id, tax_rate, discount_amount')
      .eq('id', invoiceId)
      .eq('vendor_account_id', vendorAccountId)
      .single();
    if (!invoice) throw new NotFoundException('Invoice not found');

    const { error } = await admin.from('vendor_invoice_items').insert({
      vendor_invoice_id: invoiceId,
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
    item: Partial<VendorInvoiceItemDto>,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data: existing } = await admin
      .from('vendor_invoice_items')
      .select(
        '*, vendor_invoices!inner(vendor_account_id, tax_rate, discount_amount)',
      )
      .eq('id', itemId)
      .single();

    const parentInvoice = existing ? existing.vendor_invoices : null;
    if (!existing || parentInvoice?.vendor_account_id !== vendorAccountId) {
      throw new NotFoundException('Item not found');
    }

    const qty = item.quantity ?? existing.quantity;
    const price = item.unit_price ?? existing.unit_price;

    const { error } = await admin
      .from('vendor_invoice_items')
      .update({ ...item, amount: qty * price })
      .eq('id', itemId);
    if (error) throw new Error(error.message);

    await this.recalcAndSaveInvoiceTotals(
      existing.vendor_invoice_id,
      parentInvoice.tax_rate,
      parentInvoice.discount_amount,
    );
    return this.getInvoice(userId, existing.vendor_invoice_id);
  }

  async deleteItem(userId: string, itemId: string) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data: existing } = await admin
      .from('vendor_invoice_items')
      .select(
        'vendor_invoice_id, vendor_invoices!inner(vendor_account_id, tax_rate, discount_amount)',
      )
      .eq('id', itemId)
      .single();

    const parentInvoice = existing ? (existing.vendor_invoices as any) : null;
    if (!existing || parentInvoice?.vendor_account_id !== vendorAccountId) {
      throw new NotFoundException('Item not found');
    }

    await admin.from('vendor_invoice_items').delete().eq('id', itemId);
    await this.recalcAndSaveInvoiceTotals(
      existing.vendor_invoice_id,
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
      .from('vendor_invoice_items')
      .select('quantity, unit_price')
      .eq('vendor_invoice_id', invoiceId);
    const { data: current } = await admin
      .from('vendor_invoices')
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
      .from('vendor_invoices')
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

  // ─── Send invoice email ──────────────────────────────────────────────────────

  async sendInvoice(
    userId: string,
    invoiceId: string,
  ): Promise<{ success: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);
    const { data: vendorAccount } = await admin
      .from('vendor_accounts')
      .select('stripe_account_id, stripe_connect_status')
      .eq('id', vendorAccountId)
      .single();

    const hasStripe =
      vendorAccount?.stripe_account_id &&
      vendorAccount.stripe_connect_status === 'active';
    if (!hasStripe) {
      throw new BadRequestException(
        'You must connect a Stripe account before sending invoices. Go to Payouts in your dashboard to set up Stripe.',
      );
    }

    const invoice = await this.getInvoice(userId, invoiceId);
    const payUrl = `${this.frontendUrl}/pay/${invoice.public_token}`;
    const vendorName = invoice.vendor_accounts?.business_name ?? 'Your Vendor';

    const emailSent = await this.sendInvoiceEmail({
      to: invoice.client_email,
      clientName: invoice.client_name,
      vendorName,
      invoiceNumber: invoice.invoice_number,
      totalAmount: invoice.total_amount,
      dueDate: invoice.due_date,
      payUrl,
    });

    // Always mark as sent so the client portal shows it
    await admin
      .from('vendor_invoices')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    // Send SMS with payment link if client has a phone number
    const clientPhone = invoice.client_phone as string | null;
    try {
      await this.smsNotifications.vendorInvoiceSent(
        clientPhone,
        invoice.client_name,
        vendorName,
        invoice.total_amount,
        payUrl,
      );
      if (clientPhone)
        this.logger.log(`Invoice SMS sent to client at ${clientPhone}`);
    } catch (smsErr: any) {
      this.logger.warn(
        `Failed to send invoice SMS to ${clientPhone}: ${smsErr?.message}`,
      );
    }

    return { success: emailSent };
  }

  private async sendInvoiceEmail(params: {
    to: string;
    clientName: string;
    vendorName: string;
    invoiceNumber: string;
    totalAmount: number;
    dueDate: string;
    payUrl: string;
  }): Promise<boolean> {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP not configured — invoice email not sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS.',
      );
      this.logger.log(`[DEV] Invoice email to ${params.to}: ${params.payUrl}`);
      return true; // treat as sent in dev so status updates
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
        <h2 style="color:#4f46e5;">Invoice from ${params.vendorName}</h2>
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
        from: `"${params.vendorName}" <${fromAddress}>`,
        to: params.to,
        subject: `Invoice ${params.invoiceNumber} from ${params.vendorName} — ${amount} due`,
        html,
      });
      this.logger.log(`Invoice email sent to ${params.to}`);
      return true;
    } catch (err) {
      this.logger.error('Failed to send invoice email', (err as Error).message);
      return false;
    }
  }

  // ─── Public invoice (no auth) ───────────────────────────────────────────────

  async getPublicInvoice(token: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_invoices')
      .select(
        '*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone, city, state, profile_image_url, enable_bnpl)',
      )
      .eq('public_token', token)
      .single();

    if (error || !data) throw new NotFoundException('Invoice not found');

    // Mark as viewed once (if still in 'sent' status)
    if (data.status === 'sent') {
      await admin
        .from('vendor_invoices')
        .update({ status: 'viewed', updated_at: new Date().toISOString() })
        .eq('id', data.id);
      data.status = 'viewed';
    }

    // Strip internal fields before returning to unauthenticated caller
    const { enable_bnpl, ...vendorPublic } = data.vendor_accounts ?? {};
    const {
      public_token: _tok,
      stripe_checkout_session_id: _sess,
      stripe_payment_intent_id: _pi,
      pending_credit_cents: _pending,
      ...safe
    } = data;
    const amountCents = Math.round(Number(data.amount_due) * 100);
    const depositCents = creditCentsFor(data, 'deposit');
    return {
      ...safe,
      vendor_accounts: data.vendor_accounts ? vendorPublic : null,
      pay_later_available: !!enable_bnpl,
      bank_available: true,
      processing_fee_cents: {
        card: processingFeeCents(amountCents, 'card'),
        pay_later: processingFeeCents(amountCents, 'pay_later'),
        bank: processingFeeCents(amountCents, 'bank'),
      },
      ...(hasDeposit(data)
        ? {
            deposit_processing_fee_cents: {
              card: processingFeeCents(depositCents, 'card'),
              pay_later: processingFeeCents(depositCents, 'pay_later'),
              bank: processingFeeCents(depositCents, 'bank'),
            },
          }
        : {}),
    };
  }

  // ─── Stripe Checkout for public invoice payment ──────────────────────────────

  /** The saved status only changes on a webhook or the vendor's own dashboard visit, so confirm with Stripe before refusing payment. */
  private async vendorCanReceivePayments(
    vendorAccountId: string,
    vendor:
      | {
          stripe_account_id?: string | null;
          stripe_connect_status?: string | null;
        }
      | null
      | undefined,
  ): Promise<boolean> {
    if (!vendor?.stripe_account_id) return false;
    if (vendor.stripe_connect_status === 'active') return true;

    try {
      const account = await this.stripe.accounts.retrieve(
        vendor.stripe_account_id,
      );
      const ready =
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled;
      if (!ready) return false;

      await this.supabaseService
        .getAdminClient()
        .from('vendor_accounts')
        .update({ stripe_connect_status: 'active' })
        .eq('id', vendorAccountId);
      this.logger.log(
        `Vendor ${vendorAccountId} Stripe account confirmed active during checkout`,
      );
      return true;
    } catch (err) {
      this.logger.warn(
        `Live Stripe check failed for vendor ${vendorAccountId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  async createCheckoutSession(
    token: string,
    payMethodInput: unknown = 'card',
    payAmountInput?: unknown,
  ): Promise<{ url: string; feeCents: number }> {
    const payMethod = normalizePayMethod(payMethodInput, true);
    const payAmount = normalizePayAmount(payAmountInput);
    const admin = this.supabaseService.getAdminClient();

    const { data: invoice, error } = await admin
      .from('vendor_invoices')
      .select(
        '*, vendor_accounts(stripe_account_id, stripe_connect_status, business_name, enable_bnpl)',
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
        this.markInvoiceProcessing(sessionId, paymentIntentId, invoice.id),
    );

    // Invoices without a deposit always charge the full amount due.
    const amountCents = creditCentsFor(invoice, payAmount);
    if (amountCents <= 0)
      throw new ForbiddenException('Invoice amount must be greater than zero');
    const isDepositPayment = hasDeposit(invoice) && payAmount === 'deposit';

    const vendor = invoice.vendor_accounts;
    const hasConnect = await this.vendorCanReceivePayments(
      invoice.vendor_account_id,
      vendor,
    );
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: paymentMethodTypesFor(
        vendor?.enable_bnpl,
        payMethod,
        { bankDebit: true, bankAlways: true },
      ),
      customer_email: invoice.client_email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: `${isDepositPayment ? 'Deposit — ' : ''}Invoice ${invoice.invoice_number}`,
              description: `Payment to ${vendor?.business_name ?? 'Vendor'}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url:
        invoice.invoice_type === 'owner_booking'
          ? `${this.frontendUrl}/dashboard/vendors/payments?paid=true&token=${token}`
          : `${this.frontendUrl}/pay/${token}?paid=true`,
      cancel_url:
        invoice.invoice_type === 'owner_booking'
          ? `${this.frontendUrl}/dashboard/vendors/payments?canceled=true`
          : `${this.frontendUrl}/pay/${token}?canceled=true`,
      metadata: { vendor_invoice_id: invoice.id, vendor_invoice_token: token },
      client_reference_id: invoice.id,
    };

    if (!hasConnect) {
      throw new BadRequestException(
        'This vendor has not connected a Stripe account. Payment cannot be processed until the vendor completes Stripe onboarding.',
      );
    }

    const platformFeeCents = Math.round(amountCents * OWNER_BOOKING_FEE_RATE);

    // The payer absorbs Stripe's processing fee for the chosen payment method.
    const stripeFeeCents = processingFeeCents(amountCents, payMethod);

    // Replace the base line item with the grossed-up amount
    sessionParams.line_items = [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `${isDepositPayment ? 'Deposit — ' : ''}Invoice ${invoice.invoice_number}`,
            description: `Payment to ${vendor?.business_name ?? 'Vendor'}`,
          },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          unit_amount: stripeFeeCents,
          product_data: processingFeeLine(payMethod),
        },
        quantity: 1,
      },
    ];

    // Platform fee (3%) deducted from vendor's payout
    sessionParams.payment_intent_data = {
      transfer_data: { destination: vendor.stripe_account_id },
      application_fee_amount: applicationFeeCents(
        platformFeeCents,
        stripeFeeCents,
      ),
      metadata: { vendor_invoice_id: invoice.id },
    };

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    // Record session ID so webhook can reconcile
    await admin
      .from('vendor_invoices')
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
      `Vendor invoice checkout: ${session.id} for invoice ${invoice.id}`,
    );
    return { url: session.url!, feeCents: stripeFeeCents };
  }

  // ─── Called from webhook when payment succeeds ──────────────────────────────

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
      .from('vendor_invoices')
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
      const vendorPhone: string | null =
        (invoice.vendor_accounts as any)?.phone ?? null;
      const vendorName: string =
        (invoice.vendor_accounts as any)?.business_name ?? 'Vendor';
      await this.smsNotifications.vendorInvoicePaid(
        vendorPhone,
        vendorName,
        invoice.client_name ?? 'Client',
        paidAmount,
      );
      // Also notify client that payment was received
      await this.smsNotifications.paymentReceived(
        invoice.client_phone ?? null,
        invoice.client_name ?? 'Valued Client',
        paidAmount,
        `${isDeposit ? 'a deposit on ' : ''}your invoice from ${vendorName}`,
      );
    } catch {
      // SMS errors must never break payment processing
    }
  }

  /** The vendor booking is only marked paid once the whole invoice is paid. */
  private async markBookingPaid(invoice: any, fullyPaid: boolean) {
    if (!fullyPaid || !invoice.vendor_booking_id) return;
    const admin = this.supabaseService.getAdminClient();
    await admin
      .from('vendor_bookings')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', invoice.vendor_booking_id);
  }

  async markInvoicePaidBySession(
    sessionId: string,
    paymentIntentId: string | null,
    invoiceId?: string,
  ) {
    const admin = this.supabaseService.getAdminClient();
    let { data: invoice } = await admin
      .from('vendor_invoices')
      .select('*, vendor_accounts(business_name, phone)')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();

    // Each Pay Now click replaces the stored session, so an earlier tab's payment is found by invoice id instead.
    if (!invoice && invoiceId) {
      ({ data: invoice } = await admin
        .from('vendor_invoices')
        .select('*, vendor_accounts(business_name, phone)')
        .eq('id', invoiceId)
        .maybeSingle());
    }

    if (!invoice) {
      this.logger.warn(
        `No vendor invoice found for Stripe session ${sessionId}`,
      );
      return;
    }

    let paidAmount: number = invoice.total_amount;
    let fullyPaid = true;
    if (invoice.deposit_amount != null) {
      const credited = await this.creditDepositPayment(
        invoice,
        paymentIntentId,
      );
      if (!credited) return;
      paidAmount = credited.creditedCents / 100;
      fullyPaid = credited.fullyPaid;
    } else {
      await admin
        .from('vendor_invoices')
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

    await this.markBookingPaid(invoice, fullyPaid);

    this.logger.log(
      `Vendor invoice ${invoice.id} payment recorded via session ${sessionId}`,
    );

    await this.notifyPayment(invoice, paidAmount, !fullyPaid);
  }

  // ─── ACH delayed payment handlers ───────────────────────────────────────────

  async markInvoiceProcessing(
    sessionId: string,
    paymentIntentId: string | null,
    invoiceId?: string,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const patch = {
      status: 'processing',
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    };
    // Skipping rows already processing means only the first of the webhook and the page-return check notifies.
    const bySession = await admin
      .from('vendor_invoices')
      .update(patch)
      .eq('stripe_checkout_session_id', sessionId)
      .neq('status', 'paid')
      .neq('status', 'processing')
      .select('id');
    if (bySession.error) {
      this.logger.error(
        `Could not mark vendor invoice processing (session ${sessionId}): ${bySession.error.message}`,
      );
      return;
    }
    let changed: string[] = (bySession.data ?? []).map((r: any) => r.id);
    if (changed.length === 0 && invoiceId) {
      const byId = await admin
        .from('vendor_invoices')
        .update({ ...patch, stripe_checkout_session_id: sessionId })
        .eq('id', invoiceId)
        .neq('status', 'paid')
        .neq('status', 'processing')
        .select('id');
      if (byId.error)
        this.logger.error(
          `Could not mark vendor invoice ${invoiceId} processing: ${byId.error.message}`,
        );
      changed = (byId.data ?? []).map((r: any) => r.id);
    }
    this.logger.log(
      `Vendor invoice set to processing via session ${sessionId}`,
    );
    for (const id of changed) await this.notifyPaymentSubmitted(id);
  }

  /** Tells the vendor a bank payment is on its way; it is not paid until the bank clears. */
  private async notifyPaymentSubmitted(invoiceId: string) {
    try {
      const { data: invoice } = await this.supabaseService
        .getAdminClient()
        .from('vendor_invoices')
        .select(
          'invoice_number, client_name, total_amount, amount_due, vendor_accounts(business_name, phone, email)',
        )
        .eq('id', invoiceId)
        .maybeSingle();
      const vendor = (
        Array.isArray(invoice?.vendor_accounts)
          ? invoice?.vendor_accounts[0]
          : invoice?.vendor_accounts
      ) as
        | { business_name?: string; phone?: string; email?: string }
        | undefined;
      if (!invoice || !vendor) return;

      const amount = Number(invoice.amount_due ?? invoice.total_amount ?? 0);
      const vendorName = vendor.business_name ?? 'Vendor';
      const clientName = invoice.client_name ?? 'Client';
      await this.smsNotifications.vendorInvoicePaymentSubmitted(
        vendor.phone,
        vendorName,
        clientName,
        amount,
      );
      if (vendor.email)
        await this.sendPaymentSubmittedEmail({
          to: vendor.email,
          vendorName,
          clientName,
          invoiceNumber: invoice.invoice_number,
          amount,
        });
    } catch (err) {
      // A failed notification must never undo or block recording the payment.
      this.logger.warn(
        `Payment-submitted notification failed: ${(err as Error).message}`,
      );
    }
  }

  private async sendPaymentSubmittedEmail(params: {
    to: string;
    vendorName: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
  }) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP not configured — payment-submitted email not sent.',
      );
      return;
    }
    const escape = (v: string) =>
      v
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(this.configService.get<string>('SMTP_PORT', '587')),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });
    const amount = `$${params.amount.toFixed(2)}`;
    await transporter.sendMail({
      from: `"EventEcos" <${this.configService.get<string>('SMTP_FROM', smtpUser)}>`,
      to: params.to,
      subject: `Payment submitted for invoice ${params.invoiceNumber}`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#4f46e5;">Payment on its way</h2>
        <p>Hi ${escape(params.vendorName)},</p>
        <p>${escape(params.clientName)} submitted a bank payment of <strong>${amount}</strong> for invoice <strong>${escape(params.invoiceNumber)}</strong>.</p>
        <p>Bank payments usually take 4&ndash;5 business days to clear. Your invoice will show as paid, and we will let you know, once the funds arrive.</p>
        <p style="color:#666;font-size:13px;">Powered by EventEcos</p>
      </div>`,
    });
    this.logger.log(`Payment-submitted email sent to ${params.to}`);
  }

  async markInvoicePaidByPaymentIntent(paymentIntentId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('vendor_invoices')
      .select('*, vendor_accounts(business_name, phone)')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (!invoice) {
      // Typically an extra payment from a second checkout that the invoice no longer points to.
      this.logger.warn(
        `Vendor payment ${paymentIntentId} succeeded but no invoice stores it; check Stripe for a duplicate payment`,
      );
      return;
    }

    let paidAmount: number = invoice.total_amount;
    let fullyPaid = true;
    if (invoice.deposit_amount != null) {
      const credited = await this.creditDepositPayment(invoice, null);
      if (!credited) return;
      paidAmount = credited.creditedCents / 100;
      fullyPaid = credited.fullyPaid;
    } else {
      await admin
        .from('vendor_invoices')
        .update({
          status: 'paid',
          amount_paid: invoice.total_amount,
          amount_due: 0,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);
    }

    await this.markBookingPaid(invoice, fullyPaid);

    this.logger.log(
      `Vendor invoice ${invoice.id} payment recorded via PaymentIntent ${paymentIntentId}`,
    );

    await this.notifyPayment(invoice, paidAmount, !fullyPaid);
  }

  async revertProcessingStatus(paymentIntentId: string) {
    const admin = this.supabaseService.getAdminClient();
    await admin
      .from('vendor_invoices')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('status', 'processing');
  }

  /**
   * Stripe refunded the payment behind an invoice. A full refund of a one-shot payment cancels the
   * invoice and reopens its booking (unless another invoice for the booking is paid). Partial refunds
   * and invoices with a deposit schedule are only noted, because the right outcome needs a person.
   * Returns false when no invoice belongs to the payment.
   */
  async markInvoiceRefundedByPaymentIntent(
    paymentIntentId: string,
    refundedCents: number,
    fullyRefunded: boolean,
  ): Promise<boolean> {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('vendor_invoices')
      .select('id, status, notes, deposit_amount, vendor_booking_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();
    if (!invoice) return false;

    const amount = `$${(refundedCents / 100).toFixed(2)}`;
    const day = new Date().toISOString().slice(0, 10);
    const append = (line: string) =>
      [invoice.notes, line].filter(Boolean).join('\n');
    const noteOnly = async (line: string) => {
      if (invoice.notes?.includes(line)) return;
      await admin
        .from('vendor_invoices')
        .update({ notes: append(line), updated_at: new Date().toISOString() })
        .eq('id', invoice.id);
    };

    const oneShot = invoice.deposit_amount == null;
    if (!fullyRefunded || !oneShot) {
      await noteOnly(
        `Stripe refunded ${amount} on ${day}. Review this invoice.`,
      );
      this.logger.warn(
        `Refund of ${amount} on vendor invoice ${invoice.id} needs manual review`,
      );
      return true;
    }
    if (invoice.status !== 'paid') {
      this.logger.log(
        `Refund on vendor invoice ${invoice.id} ignored: status is ${invoice.status}`,
      );
      return true;
    }

    const { data: updated, error } = await admin
      .from('vendor_invoices')
      .update({
        status: 'cancelled',
        amount_paid: 0,
        amount_due: 0,
        paid_at: null,
        notes: append(
          `Refunded ${amount} via Stripe on ${day}; invoice cancelled.`,
        ),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id)
      .eq('status', 'paid')
      .select('id');
    if (error) {
      this.logger.error(
        `Could not cancel refunded vendor invoice ${invoice.id}: ${error.message}`,
      );
      throw new Error(error.message);
    }
    if (!updated?.length) return true;

    if (invoice.vendor_booking_id) {
      const { data: stillPaid } = await admin
        .from('vendor_invoices')
        .select('id')
        .eq('vendor_booking_id', invoice.vendor_booking_id)
        .eq('status', 'paid')
        .neq('id', invoice.id)
        .limit(1);
      if (!stillPaid?.length) {
        await admin
          .from('vendor_bookings')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', invoice.vendor_booking_id)
          .eq('status', 'paid');
      }
    }
    this.logger.log(
      `Vendor invoice ${invoice.id} cancelled after a full refund of ${amount}`,
    );
    return true;
  }

  // ─── Verify payment via Stripe (webhook fallback) ───────────────────────────

  async verifyPayment(
    token: string,
  ): Promise<{ status: string; paid: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('vendor_invoices')
      .select('*, vendor_accounts(business_name, phone)')
      .eq('public_token', token)
      .maybeSingle();

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') return { status: 'paid', paid: true };

    // No session yet — can't verify
    if (!invoice.stripe_checkout_session_id)
      return { status: invoice.status, paid: false };

    // Ask Stripe directly
    const session = await this.stripe.checkout.sessions.retrieve(
      invoice.stripe_checkout_session_id,
    );
    if (session.payment_status !== 'paid') {
      // A bank debit finishes checkout as 'unpaid' while it clears; record that so the invoice stops offering Pay Now.
      if (
        session.status === 'complete' &&
        session.payment_status === 'unpaid' &&
        invoice.status !== 'processing'
      ) {
        const pendingIntent =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        await this.markInvoiceProcessing(
          invoice.stripe_checkout_session_id,
          pendingIntent,
        );
        return { status: 'processing', paid: false };
      }
      return { status: invoice.status, paid: false };
    }

    // Stripe confirms paid — record it now (webhook fallback)
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
          .from('vendor_invoices')
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
        .from('vendor_invoices')
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

    await this.markBookingPaid(invoice, fullyPaid);

    this.logger.log(
      `Vendor invoice ${invoice.id} verified and payment recorded (webhook fallback)`,
    );

    // Send SMS notifications (same as webhook path)
    await this.notifyPayment(invoice, paidAmount, !fullyPaid);

    return fullyPaid
      ? { status: 'paid', paid: true }
      : { status: 'sent', paid: false };
  }
}
