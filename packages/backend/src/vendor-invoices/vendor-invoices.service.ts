import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';
import { CreateVendorInvoiceDto, UpdateVendorInvoiceDto, VendorInvoiceItemDto } from './dto/vendor-invoice.dto';

const APP_FEE_RATE = 0.05;           // 5% platform fee — vendor-to-client invoices
const OWNER_BOOKING_FEE_RATE = 0.015; // 1.5% platform fee — owner-to-vendor invoices (1.5% above Stripe's processing fee)

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
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://dovenuesuite.com');
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

  async listOwnerBookingInvoices(ownerAccountId: string, ownerUserId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Find all owner vendor_bookings with an agreed_amount
    const { data: bookings } = await admin
      .from('vendor_bookings')
      .select('id, vendor_account_id, event_name, event_date, agreed_amount, booked_by_user_id, vendor_accounts(id, business_name, phone)')
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

      const invoicedBookingIds = new Set((existingInvoices ?? []).map((i: any) => i.vendor_booking_id));

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
              { vendorAccountId: vendor.id, eventName: booking.event_name ?? 'Vendor Event', eventDate: booking.event_date, agreedAmount: Number(booking.agreed_amount) } as any,
              ownerAccountId,
              userId,
            );
            this.logger.log(`Backfilled owner booking invoice for booking ${booking.id}`);
          } catch (e) {
            this.logger.warn(`Backfill invoice failed for booking ${booking.id}: ${(e as Error).message}`);
          }
        }
      }
    }

    // Return all owner_booking invoices for this owner
    const { data, error } = await admin
      .from('vendor_invoices')
      .select('*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone), vendor_bookings(event_name, event_date, status)')
      .eq('owner_account_id', ownerAccountId)
      .eq('invoice_type', 'owner_booking')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  private async autoCreateOwnerBookingInvoice(
    bookingId: string,
    vendor: { id: string; business_name: string },
    dto: { vendorAccountId: string; eventName: string; eventDate?: string; agreedAmount: number },
    ownerAccountId: string,
    ownerUserId: string,
  ) {
    const admin = this.supabaseService.getAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(ownerUserId);
    if (userErr || !user?.email) throw new Error('Could not resolve owner email');

    const ownerName = [user.user_metadata?.first_name, user.user_metadata?.last_name]
      .filter(Boolean).join(' ') || user.email;

    const year = new Date().getFullYear();
    const { count } = await admin.from('vendor_invoices').select('*', { count: 'exact', head: true });
    const seq = String((count ?? 0) + 1).padStart(5, '0');
    const invoiceNumber = `BINV-${year}-${seq}`;

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

    if (invErr || !invoice) throw new Error(invErr?.message ?? 'Failed to insert owner booking invoice');

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
      .select('*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone, city, state)')
      .eq('id', invoiceId)
      .eq('vendor_account_id', vendorAccountId)
      .single();

    if (error || !data) throw new NotFoundException('Invoice not found');
    return data;
  }

  /** Owner (payer) fetches a vendor invoice linked to one of their bookings */
  async getInvoiceAsOwner(ownerAccountId: string, invoiceId: string) {
    const admin = this.supabaseService.getAdminClient();

    // Verify the invoice belongs to a booking owned by this owner
    const { data, error } = await admin
      .from('vendor_invoices')
      .select('*, vendor_invoice_items(*), vendor_accounts(business_name, email, phone, city, state)')
      .eq('id', invoiceId)
      .single();

    if (error || !data) throw new NotFoundException('Invoice not found');

    // Security check: the linked vendor_booking must belong to this owner
    if (data.vendor_booking_id) {
      const { data: booking } = await admin
        .from('vendor_bookings')
        .select('owner_account_id')
        .eq('id', data.vendor_booking_id)
        .single();
      if (!booking || booking.owner_account_id !== ownerAccountId) {
        throw new ForbiddenException('Access denied');
      }
    } else if (data.owner_account_id !== ownerAccountId) {
      throw new ForbiddenException('Access denied');
    }

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

    // Send SMS with payment link if client has a phone number
    const clientPhone = (invoice as any).client_phone as string | null;
    try {
      await this.smsNotifications.vendorInvoiceSent(
        clientPhone,
        invoice.client_name,
        vendorName,
        invoice.total_amount,
        payUrl,
      );
      if (clientPhone) this.logger.log(`Invoice SMS sent to client at ${clientPhone}`);
    } catch (smsErr: any) {
      this.logger.warn(`Failed to send invoice SMS to ${clientPhone}: ${smsErr?.message}`);
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
      success_url: invoice.invoice_type === 'owner_booking'
        ? `${this.frontendUrl}/dashboard/vendors/payments?paid=true&token=${token}`
        : `${this.frontendUrl}/pay/${token}?paid=true`,
      cancel_url: invoice.invoice_type === 'owner_booking'
        ? `${this.frontendUrl}/dashboard/vendors/payments?canceled=true`
        : `${this.frontendUrl}/pay/${token}?canceled=true`,
      metadata: { vendor_invoice_id: invoice.id, vendor_invoice_token: token },
      client_reference_id: invoice.id,
    };

    let feeCents = 0;
    if (hasConnect) {
      const feeRate = invoice.invoice_type === 'owner_booking' ? OWNER_BOOKING_FEE_RATE : APP_FEE_RATE;
      feeCents = Math.round(amountCents * feeRate);
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
      .select('id, total_amount, amount_due, vendor_booking_id, client_name, client_phone, vendor_account_id, vendor_accounts(business_name, phone)')
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

    // Also mark the associated vendor booking as paid
    if (invoice.vendor_booking_id) {
      await admin
        .from('vendor_bookings')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', invoice.vendor_booking_id);
    }

    this.logger.log(`Vendor invoice ${invoice.id} marked paid via session ${sessionId}`);

    // Notify vendor that payment was received
    try {
      const vendorPhone: string | null = (invoice.vendor_accounts as any)?.phone ?? null;
      const vendorName: string = (invoice.vendor_accounts as any)?.business_name ?? 'Vendor';
      await this.smsNotifications.vendorInvoicePaid(
        vendorPhone,
        vendorName,
        invoice.client_name ?? 'Client',
        invoice.total_amount,
      );
      // Also notify client that payment was received
      await this.smsNotifications.paymentReceived(
        invoice.client_phone ?? null,
        invoice.client_name ?? 'Valued Client',
        invoice.total_amount,
        `your invoice from ${vendorName}`,
      );
    } catch {
      // SMS errors must never break payment processing
    }
  }

  // ─── Verify payment via Stripe (webhook fallback) ───────────────────────────

  async verifyPayment(token: string): Promise<{ status: string; paid: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('vendor_invoices')
      .select('id, status, total_amount, stripe_checkout_session_id, vendor_booking_id')
      .eq('public_token', token)
      .maybeSingle();

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') return { status: 'paid', paid: true };

    // No session yet — can't verify
    if (!invoice.stripe_checkout_session_id) return { status: invoice.status, paid: false };

    // Ask Stripe directly
    const session = await this.stripe.checkout.sessions.retrieve(invoice.stripe_checkout_session_id);
    if (session.payment_status !== 'paid') return { status: invoice.status, paid: false };

    // Stripe confirms paid — mark it now (webhook fallback)
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

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

    // Also mark the associated vendor booking as paid
    if (invoice.vendor_booking_id) {
      await admin
        .from('vendor_bookings')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', invoice.vendor_booking_id);
    }

    this.logger.log(`Vendor invoice ${invoice.id} verified and marked paid (webhook fallback)`);
    return { status: 'paid', paid: true };
  }
}
