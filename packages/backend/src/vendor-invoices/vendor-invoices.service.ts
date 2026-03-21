import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';
import { CreateVendorInvoiceDto, UpdateVendorInvoiceDto, VendorInvoiceItemDto } from './dto/vendor-invoice.dto';

const APP_FEE_RATE = 0.05; // 5% platform fee (charged on top of Stripe's standard processing fees)

@Injectable()
export class VendorInvoicesService {
  private readonly logger = new Logger(VendorInvoicesService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
    this.stripe = new Stripe(secretKey);
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  // ─── Invoice number generation ──────────────────────────────────────────────

  private async generateInvoiceNumber(): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const year = new Date().getFullYear();
    const { count } = await admin
      .from('vendor_invoices')
      .select('*', { count: 'exact', head: true });
    const seq = String((count ?? 0) + 1).padStart(5, '0');
    return `VINV-${year}-${seq}`;
  }

  private calculateTotals(
    items: Pick<VendorInvoiceItemDto, 'quantity' | 'unit_price'>[],
    taxRate: number,
    discountAmount: number,
  ) {
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
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
    if (error || !data) throw new ForbiddenException('No vendor account found for this user');
    return data.id;
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async createInvoice(userId: string, dto: CreateVendorInvoiceDto) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);
    const invoiceNumber = await this.generateInvoiceNumber();
    const taxRate = dto.tax_rate ?? 0;
    const discountAmount = dto.discount_amount ?? 0;
    const { subtotal, taxAmount, totalAmount, amountDue } = this.calculateTotals(
      dto.items,
      taxRate,
      discountAmount,
    );

    const { data: invoice, error: invErr } = await admin
      .from('vendor_invoices')
      .insert({
        vendor_account_id: vendorAccountId,
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
      })
      .select()
      .single();

    if (invErr || !invoice) throw new Error(invErr?.message ?? 'Failed to create invoice');

    if (dto.items.length > 0) {
      const lineItems = dto.items.map(item => ({
        vendor_invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
      }));
      const { error: itemsErr } = await admin.from('vendor_invoice_items').insert(lineItems);
      if (itemsErr) this.logger.error('Failed to insert invoice items', itemsErr);
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

  async getInvoice(userId: string, invoiceId: string) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data, error } = await admin
      .from('vendor_invoices')
      .select('*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone, city, state)')
      .eq('id', invoiceId)
      .eq('vendor_account_id', vendorAccountId)
      .single();

    if (error || !data) throw new NotFoundException('Invoice not found');
    return data;
  }

  async updateInvoice(userId: string, invoiceId: string, dto: UpdateVendorInvoiceDto) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data: existing } = await admin
      .from('vendor_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('vendor_account_id', vendorAccountId)
      .single();

    if (!existing) throw new NotFoundException('Invoice not found');

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

    await this.recalcAndSaveInvoiceTotals(invoiceId, invoice.tax_rate, invoice.discount_amount);
    return this.getInvoice(userId, invoiceId);
  }

  async updateItem(userId: string, itemId: string, item: Partial<VendorInvoiceItemDto>) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountId(userId);

    const { data: existing } = await admin
      .from('vendor_invoice_items')
      .select('*, vendor_invoices!inner(vendor_account_id, tax_rate, discount_amount)')
      .eq('id', itemId)
      .single();

    const parentInvoice = existing ? (existing.vendor_invoices as any) : null;
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
      .select('vendor_invoice_id, vendor_invoices!inner(vendor_account_id, tax_rate, discount_amount)')
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

  private async recalcAndSaveInvoiceTotals(invoiceId: string, taxRate: number, discountAmount: number) {
    const admin = this.supabaseService.getAdminClient();
    const { data: items } = await admin
      .from('vendor_invoice_items')
      .select('quantity, unit_price')
      .eq('vendor_invoice_id', invoiceId);

    const { subtotal, taxAmount, totalAmount, amountDue } = this.calculateTotals(
      (items ?? []) as { quantity: number; unit_price: number }[],
      Number(taxRate),
      Number(discountAmount),
    );

    await admin
      .from('vendor_invoices')
      .update({ subtotal, tax_amount: taxAmount, total_amount: totalAmount, amount_due: amountDue, updated_at: new Date().toISOString() })
      .eq('id', invoiceId);
  }

  // ─── Send invoice email ──────────────────────────────────────────────────────

  async sendInvoice(userId: string, invoiceId: string): Promise<{ success: boolean }> {
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

    if (emailSent) {
      const admin = this.supabaseService.getAdminClient();
      await admin
        .from('vendor_invoices')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
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
      this.logger.warn('SMTP not configured — invoice email not sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
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
      .select('*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone, city, state, profile_image_url)')
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
    const { public_token: _tok, stripe_checkout_session_id: _sess, stripe_payment_intent_id: _pi, ...safe } = data;
    return safe;
  }

  // ─── Stripe Checkout for public invoice payment ──────────────────────────────

  async createCheckoutSession(token: string): Promise<{ url: string; feeCents: number }> {
    const admin = this.supabaseService.getAdminClient();

    const { data: invoice, error } = await admin
      .from('vendor_invoices')
      .select('*, vendor_accounts(stripe_account_id, stripe_connect_status, business_name)')
      .eq('public_token', token)
      .single();

    if (error || !invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new ForbiddenException('Invoice is already paid');
    if (invoice.status === 'cancelled') throw new ForbiddenException('Invoice has been cancelled');

    const amountCents = Math.round(Number(invoice.amount_due) * 100);
    if (amountCents <= 0) throw new ForbiddenException('Invoice amount must be greater than zero');

    const vendor = invoice.vendor_accounts;
    const hasConnect = vendor?.stripe_account_id && vendor?.stripe_connect_status === 'active';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: invoice.client_email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment to ${vendor?.business_name ?? 'Vendor'}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${this.frontendUrl}/pay/${token}?paid=true`,
      cancel_url: `${this.frontendUrl}/pay/${token}?canceled=true`,
      metadata: { vendor_invoice_id: invoice.id, vendor_invoice_token: token },
      client_reference_id: invoice.id,
    };

    let feeCents = 0;
    if (hasConnect) {
      feeCents = Math.round(amountCents * APP_FEE_RATE);
      sessionParams.payment_intent_data = {
        application_fee_amount: feeCents,
        transfer_data: { destination: vendor.stripe_account_id },
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    // Record session ID so webhook can reconcile
    await admin
      .from('vendor_invoices')
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', invoice.id);

    this.logger.log(`Vendor invoice checkout: ${session.id} for invoice ${invoice.id}`);
    return { url: session.url!, feeCents };
  }

  // ─── Called from webhook when payment succeeds ──────────────────────────────

  async markInvoicePaidBySession(sessionId: string, paymentIntentId: string | null) {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('vendor_invoices')
      .select('id, total_amount, amount_due')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();

    if (!invoice) {
      this.logger.warn(`No vendor invoice found for Stripe session ${sessionId}`);
      return;
    }

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

    this.logger.log(`Vendor invoice ${invoice.id} marked paid via session ${sessionId}`);
  }
}
