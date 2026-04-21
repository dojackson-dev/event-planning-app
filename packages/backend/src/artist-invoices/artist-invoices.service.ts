import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import Stripe from 'stripe';
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
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://dovenuesuite.com');
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
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
    return { subtotal, taxAmount, totalAmount, amountDue: totalAmount };
  }

  // ─── Artist account helper ────────────────────────────────────────────────

  async getArtistAccountId(userId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new ForbiddenException('No artist account found for this user');
    return data.id;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async createInvoice(userId: string, dto: CreateArtistInvoiceDto) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);
    const invoiceNumber = await this.generateInvoiceNumber();
    const taxRate = dto.tax_rate ?? 0;
    const discountAmount = dto.discount_amount ?? 0;
    const { subtotal, taxAmount, totalAmount, amountDue } = this.calculateTotals(
      dto.items,
      taxRate,
      discountAmount,
    );

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
      })
      .select()
      .single();

    if (invErr || !invoice) throw new Error(invErr?.message ?? 'Failed to create invoice');

    if (dto.items.length > 0) {
      const lineItems = dto.items.map(item => ({
        artist_invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
      }));
      const { error: itemsErr } = await admin.from('artist_invoice_items').insert(lineItems);
      if (itemsErr) this.logger.error('Failed to insert invoice items', itemsErr);
    }

    return this.getInvoice(userId, invoice.id);
  }

  async listInvoices(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

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
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data, error } = await admin
      .from('artist_invoices')
      .select('*, artist_invoice_items(*), artist_accounts(artist_name, stage_name, email, phone, city, state)')
      .eq('id', invoiceId)
      .eq('artist_account_id', artistAccountId)
      .single();

    if (error || !data) throw new NotFoundException('Invoice not found');
    return data;
  }

  async updateInvoice(userId: string, invoiceId: string, dto: UpdateArtistInvoiceDto) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data: existing } = await admin
      .from('artist_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('artist_account_id', artistAccountId)
      .single();

    if (!existing) throw new NotFoundException('Invoice not found');

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

    await this.recalcAndSaveInvoiceTotals(invoiceId, invoice.tax_rate, invoice.discount_amount);
    return this.getInvoice(userId, invoiceId);
  }

  async updateItem(userId: string, itemId: string, item: Partial<ArtistInvoiceItemDto>) {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);

    const { data: existing } = await admin
      .from('artist_invoice_items')
      .select('*, artist_invoices!inner(artist_account_id, tax_rate, discount_amount)')
      .eq('id', itemId)
      .single();

    const parentInvoice = existing ? (existing.artist_invoices as any) : null;
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
      .select('artist_invoice_id, artist_invoices!inner(artist_account_id, tax_rate, discount_amount)')
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

    const { subtotal, taxAmount, totalAmount, amountDue } = this.calculateTotals(
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
        amount_due: amountDue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);
  }

  // ─── Send invoice email ───────────────────────────────────────────────────

  async sendInvoice(userId: string, invoiceId: string): Promise<{ success: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const artistAccountId = await this.getArtistAccountId(userId);
    const { data: artistAccount } = await admin
      .from('artist_accounts')
      .select('stripe_account_id, stripe_connect_status, artist_name, stage_name')
      .eq('id', artistAccountId)
      .single();
    if (!artistAccount?.stripe_account_id || artistAccount.stripe_connect_status !== 'active') {
      throw new BadRequestException(
        'You must connect a Stripe account before sending invoices. Go to your dashboard to set up payouts.',
      );
    }

    const invoice = await this.getInvoice(userId, invoiceId);
    const payUrl = `${this.frontendUrl}/artist-pay/${invoice.public_token}`;
    const artistName =
      (invoice.artist_accounts as any)?.stage_name ||
      (invoice.artist_accounts as any)?.artist_name ||
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

    const clientPhone = (invoice as any).client_phone as string | null;
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
      this.logger.error('Failed to send artist invoice email', (err as Error).message);
      return false;
    }
  }

  // ─── Public invoice (no auth) ──────────────────────────────────────────────

  async getPublicInvoice(token: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('artist_invoices')
      .select(
        '*, artist_invoice_items(*), artist_accounts(artist_name, stage_name, email, phone, city, state, profile_image_url)',
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

    const {
      public_token: _tok,
      stripe_checkout_session_id: _sess,
      stripe_payment_intent_id: _pi,
      ...safe
    } = data;
    return safe;
  }

  // ─── Stripe Checkout for public invoice payment ────────────────────────────

  async createCheckoutSession(token: string): Promise<{ url: string; feeCents: number }> {
    const admin = this.supabaseService.getAdminClient();

    const { data: invoice, error } = await admin
      .from('artist_invoices')
      .select(
        '*, artist_accounts(stripe_account_id, stripe_connect_status, artist_name, stage_name)',
      )
      .eq('public_token', token)
      .single();

    if (error || !invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new ForbiddenException('Invoice is already paid');
    if (invoice.status === 'cancelled') throw new ForbiddenException('Invoice has been cancelled');

    const amountCents = Math.round(Number(invoice.amount_due) * 100);
    if (amountCents <= 0) throw new ForbiddenException('Invoice amount must be greater than zero');

    const artist = invoice.artist_accounts as any;
    const hasConnect = artist?.stripe_account_id && artist?.stripe_connect_status === 'active';

    if (!hasConnect) {
      throw new BadRequestException(
        'This artist has not connected a Stripe account. Payment cannot be processed until they complete Stripe onboarding.',
      );
    }

    const artistName = artist?.stage_name || artist?.artist_name || 'Artist';
    const feeCents = Math.round(amountCents * APP_FEE_RATE);

    const session = await this.stripe.checkout.sessions.create({
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
              description: `Payment to ${artistName}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${this.frontendUrl}/artist-pay/${token}?paid=true`,
      cancel_url: `${this.frontendUrl}/artist-pay/${token}?canceled=true`,
      metadata: { artist_invoice_id: invoice.id, artist_invoice_token: token },
      client_reference_id: invoice.id,
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: artist.stripe_account_id },
      },
    });

    await admin
      .from('artist_invoices')
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', invoice.id);

    this.logger.log(`Artist invoice checkout: ${session.id} for invoice ${invoice.id}`);
    return { url: session.url!, feeCents };
  }

  // ─── Called from webhook when payment succeeds ─────────────────────────────

  async markInvoicePaidBySession(sessionId: string, paymentIntentId: string | null) {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('artist_invoices')
      .select(
        'id, total_amount, client_name, client_phone, artist_account_id, artist_accounts(artist_name, stage_name, phone)',
      )
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();

    if (!invoice) {
      this.logger.warn(`No artist invoice found for Stripe session ${sessionId}`);
      return;
    }

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

    // Update linked booking status if exists
    await admin
      .from('artist_bookings')
      .update({ status: 'deposit_paid', updated_at: new Date().toISOString() })
      .eq('artist_invoice_id', invoice.id);

    this.logger.log(`Artist invoice ${invoice.id} marked paid via session ${sessionId}`);

    try {
      const artistAccount = invoice.artist_accounts as any;
      const artistPhone: string | null = artistAccount?.phone ?? null;
      const artistName: string = artistAccount?.stage_name || artistAccount?.artist_name || 'Artist';
      await this.smsNotifications.vendorInvoicePaid(
        artistPhone,
        artistName,
        invoice.client_name ?? 'Client',
        invoice.total_amount,
      );
      await this.smsNotifications.paymentReceived(
        (invoice as any).client_phone ?? null,
        invoice.client_name ?? 'Valued Client',
        invoice.total_amount,
        `your invoice from ${artistName}`,
      );
    } catch {
      // SMS errors must never break payment processing
    }
  }

  // ─── Verify payment via Stripe (webhook fallback) ─────────────────────────

  async verifyPayment(token: string): Promise<{ status: string; paid: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: invoice } = await admin
      .from('artist_invoices')
      .select(
        'id, status, total_amount, stripe_checkout_session_id, client_name, client_phone, artist_accounts(artist_name, stage_name, phone)',
      )
      .eq('public_token', token)
      .maybeSingle();

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') return { status: 'paid', paid: true };
    if (!invoice.stripe_checkout_session_id) return { status: invoice.status, paid: false };

    const session = await this.stripe.checkout.sessions.retrieve(
      invoice.stripe_checkout_session_id,
    );
    if (session.payment_status !== 'paid') return { status: invoice.status, paid: false };

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

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

    await admin
      .from('artist_bookings')
      .update({ status: 'deposit_paid', updated_at: new Date().toISOString() })
      .eq('artist_invoice_id', invoice.id);

    this.logger.log(`Artist invoice ${invoice.id} verified and marked paid (webhook fallback)`);

    try {
      const artistAccount = invoice.artist_accounts as any;
      const artistPhone: string | null = artistAccount?.phone ?? null;
      const artistName: string =
        artistAccount?.stage_name || artistAccount?.artist_name || 'Artist';
      await this.smsNotifications.vendorInvoicePaid(
        artistPhone,
        artistName,
        invoice.client_name ?? 'Client',
        invoice.total_amount,
      );
      await this.smsNotifications.paymentReceived(
        (invoice as any).client_phone ?? null,
        invoice.client_name ?? 'Valued Client',
        invoice.total_amount,
        `your invoice from ${artistName}`,
      );
    } catch {
      // SMS errors must never break payment processing
    }

    return { status: 'paid', paid: true };
  }
}
