import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { VendorInvoicesService } from './vendor-invoices.service';
import {
  ConvertVendorEstimateDto,
  CreateVendorEstimateDto,
  UpdateVendorEstimateDto,
} from './dto/vendor-estimate.dto';
import {
  CONVERTIBLE_ESTIMATE_STATUSES,
  EDITABLE_ESTIMATE_STATUSES,
  estimateTotals,
  nextEstimateNumber,
  validateEstimateInput,
} from './vendor-estimate-helpers';

const DEFAULT_INVOICE_TERMS_DAYS = 14;

const addDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

@Injectable()
export class VendorEstimatesService {
  private readonly logger = new Logger(VendorEstimatesService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly smsNotifications: SmsNotificationsService,
    private readonly invoices: VendorInvoicesService,
  ) {
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://www.eventecos.com',
    );
  }

  private get admin() {
    return this.supabaseService.getAdminClient();
  }

  private async generateNumber(): Promise<string> {
    const prefix = `VEST-${new Date().getFullYear()}-`;
    const { data } = await this.admin
      .from('vendor_estimates')
      .select('estimate_number')
      .like('estimate_number', `${prefix}%`)
      .order('estimate_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    return nextEstimateNumber(prefix, data?.estimate_number);
  }

  private async getOwned(userId: string, estimateId: string) {
    const vendorAccountId = await this.invoices.getVendorAccountId(userId);
    const { data } = await this.admin
      .from('vendor_estimates')
      .select(
        '*, vendor_estimate_items(*), vendor_accounts(business_name, email, phone, city, state, profile_image_url)',
      )
      .eq('id', estimateId)
      .eq('vendor_account_id', vendorAccountId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Estimate not found');
    return this.sortItems(data);
  }

  private sortItems<T extends { vendor_estimate_items?: any[] }>(estimate: T) {
    if (Array.isArray(estimate.vendor_estimate_items)) {
      estimate.vendor_estimate_items.sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
    }
    return estimate;
  }

  private itemRows(
    estimateId: string,
    items: { description: string; quantity: number; unit_price: number }[],
  ) {
    return items.map((item, index) => ({
      vendor_estimate_id: estimateId,
      description: String(item.description).trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      amount:
        Math.round(Number(item.quantity) * Number(item.unit_price) * 100) / 100,
      sort_order: index,
    }));
  }

  // ─── Vendor CRUD ────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateVendorEstimateDto) {
    validateEstimateInput({
      client_name: dto.client_name ?? '',
      client_email: dto.client_email,
      issue_date: dto.issue_date,
      expiration_date: dto.expiration_date,
      tax_rate: dto.tax_rate,
      discount_amount: dto.discount_amount,
      items: dto.items,
    });
    if (!dto.issue_date || !dto.expiration_date) {
      throw new BadRequestException(
        'Choose the issue date and the expiration date.',
      );
    }
    const vendorAccountId = await this.invoices.getVendorAccountId(userId);
    const taxRate = Number(dto.tax_rate ?? 0);
    const discount = Number(dto.discount_amount ?? 0);
    const totals = estimateTotals(dto.items, taxRate, discount);

    const { data: estimate, error } = await this.admin
      .from('vendor_estimates')
      .insert({
        vendor_account_id: vendorAccountId,
        estimate_number: await this.generateNumber(),
        client_name: dto.client_name.trim(),
        client_email: dto.client_email?.trim() || null,
        client_phone: dto.client_phone?.trim() || null,
        issue_date: dto.issue_date,
        expiration_date: dto.expiration_date,
        subtotal: totals.subtotal,
        tax_rate: taxRate,
        tax_amount: totals.taxAmount,
        discount_amount: discount,
        total_amount: totals.totalAmount,
        notes: dto.notes ?? null,
        terms: dto.terms ?? null,
        vendor_booking_id: dto.vendor_booking_id ?? null,
        status: 'draft',
      })
      .select('id')
      .single();
    if (error || !estimate) {
      this.logger.error(`Estimate insert failed: ${error?.message}`);
      throw new BadRequestException(
        'We could not save the estimate. Try again.',
      );
    }

    const { error: itemsError } = await this.admin
      .from('vendor_estimate_items')
      .insert(this.itemRows(estimate.id, dto.items));
    if (itemsError) {
      await this.admin.from('vendor_estimates').delete().eq('id', estimate.id);
      this.logger.error(`Estimate items insert failed: ${itemsError.message}`);
      throw new BadRequestException(
        'We could not save the estimate. Try again.',
      );
    }
    return this.getOwned(userId, estimate.id);
  }

  async list(userId: string) {
    const vendorAccountId = await this.invoices.getVendorAccountId(userId);
    const { data, error } = await this.admin
      .from('vendor_estimates')
      .select('*, vendor_estimate_items(id)')
      .eq('vendor_account_id', vendorAccountId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async get(userId: string, estimateId: string) {
    return this.getOwned(userId, estimateId);
  }

  async update(
    userId: string,
    estimateId: string,
    dto: UpdateVendorEstimateDto,
  ) {
    const existing = await this.getOwned(userId, estimateId);
    if (!EDITABLE_ESTIMATE_STATUSES.includes(existing.status)) {
      throw new BadRequestException(
        `This estimate can no longer be edited because it is ${existing.status}.`,
      );
    }
    validateEstimateInput({
      client_name: dto.client_name,
      client_email: dto.client_email,
      issue_date: dto.issue_date ?? existing.issue_date,
      expiration_date: dto.expiration_date ?? existing.expiration_date,
      tax_rate: dto.tax_rate,
      discount_amount: dto.discount_amount,
      items: dto.items,
    });

    const items =
      dto.items ??
      (existing.vendor_estimate_items as any[]).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      }));
    const taxRate = Number(dto.tax_rate ?? existing.tax_rate ?? 0);
    const discount = Number(
      dto.discount_amount ?? existing.discount_amount ?? 0,
    );
    const totals = estimateTotals(items, taxRate, discount);

    const fields: Record<string, unknown> = {};
    for (const key of [
      'client_name',
      'client_email',
      'client_phone',
      'issue_date',
      'expiration_date',
      'notes',
      'terms',
    ] as const) {
      if (dto[key] !== undefined) fields[key] = dto[key];
    }

    const { error } = await this.admin
      .from('vendor_estimates')
      .update({
        ...fields,
        tax_rate: taxRate,
        discount_amount: discount,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        // Changed numbers need a fresh look from the client.
        ...(existing.status === 'viewed' ? { status: 'sent' } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId);
    if (error) throw new BadRequestException(error.message);

    if (dto.items) {
      await this.admin
        .from('vendor_estimate_items')
        .delete()
        .eq('vendor_estimate_id', estimateId);
      const { error: itemsError } = await this.admin
        .from('vendor_estimate_items')
        .insert(this.itemRows(estimateId, dto.items));
      if (itemsError) throw new BadRequestException(itemsError.message);
    }
    return this.getOwned(userId, estimateId);
  }

  async remove(userId: string, estimateId: string) {
    const existing = await this.getOwned(userId, estimateId);
    if (existing.status === 'converted') {
      throw new BadRequestException(
        'This estimate was converted to an invoice and cannot be deleted.',
      );
    }
    await this.admin.from('vendor_estimates').delete().eq('id', estimateId);
    return { success: true };
  }

  // ─── Send to client ─────────────────────────────────────────────────────────

  async send(userId: string, estimateId: string) {
    const estimate = await this.getOwned(userId, estimateId);
    if (!EDITABLE_ESTIMATE_STATUSES.includes(estimate.status)) {
      throw new BadRequestException(
        `A ${estimate.status} estimate cannot be sent again.`,
      );
    }
    if (!estimate.client_email) {
      throw new BadRequestException(
        'Add the client email address before sending.',
      );
    }
    const viewUrl = `${this.frontendUrl}/vendor-estimate/${estimate.public_token}`;
    const vendorName = estimate.vendor_accounts?.business_name ?? 'Your Vendor';

    const emailSent = await this.sendEmail({
      to: estimate.client_email,
      clientName: estimate.client_name,
      vendorName,
      estimateNumber: estimate.estimate_number,
      totalAmount: estimate.total_amount,
      expirationDate: estimate.expiration_date,
      viewUrl,
    });

    await this.admin
      .from('vendor_estimates')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId);

    try {
      await this.smsNotifications.vendorEstimateSent(
        estimate.client_phone,
        estimate.client_name,
        vendorName,
        estimate.total_amount,
        viewUrl,
      );
    } catch (err) {
      this.logger.warn(`Estimate SMS failed: ${(err as Error).message}`);
    }
    return { success: emailSent };
  }

  private async sendEmail(params: {
    to: string;
    clientName: string;
    vendorName: string;
    estimateNumber: string;
    totalAmount: number;
    expirationDate: string;
    viewUrl: string;
  }): Promise<boolean> {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured; estimate email not sent.');
      this.logger.log(
        `[DEV] Estimate email to ${params.to}: ${params.viewUrl}`,
      );
      return true;
    }
    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get<string>('SMTP_PORT', '587')),
      secure: false,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
    const amount = `$${Number(params.totalAmount).toFixed(2)}`;
    const esc = (v: string) =>
      v.replace(
        /[&<>"]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
      );
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#4f46e5;">Estimate from ${esc(params.vendorName)}</h2>
        <p>Hi ${esc(params.clientName)},</p>
        <p>${esc(params.vendorName)} sent you an itemized estimate <strong>${esc(params.estimateNumber)}</strong> for <strong>${amount}</strong>. It is valid until <strong>${esc(params.expirationDate)}</strong>.</p>
        <p style="margin:24px 0;">
          <a href="${params.viewUrl}"
             style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:16px;">
            View &amp; Respond to Estimate
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Powered by DoVenue Suite</p>
      </div>`;
    try {
      await transporter.sendMail({
        from: `"${params.vendorName.replace(/"/g, '')}" <${this.configService.get<string>('SMTP_FROM', user)}>`,
        to: params.to,
        subject: `Estimate ${params.estimateNumber} from ${params.vendorName} — ${amount}`,
        html,
      });
      return true;
    } catch (err) {
      this.logger.error(`Estimate email failed: ${(err as Error).message}`);
      return false;
    }
  }

  // ─── Client (public) ────────────────────────────────────────────────────────

  async getPublic(token: string) {
    const { data } = await this.admin
      .from('vendor_estimates')
      .select(
        '*, vendor_estimate_items(*), vendor_accounts(business_name, email, phone, city, state, profile_image_url)',
      )
      .eq('public_token', token)
      .maybeSingle();
    if (!data || data.status === 'draft') {
      throw new NotFoundException('Estimate not found');
    }
    if (data.status === 'sent') {
      await this.admin
        .from('vendor_estimates')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .eq('status', 'sent');
      data.status = 'viewed';
    }
    // The token is the client's credential and the rest is internal; neither goes back out.
    const safe = { ...data };
    for (const key of [
      'public_token',
      'vendor_booking_id',
      'converted_invoice_id',
    ]) {
      delete safe[key];
    }
    return this.sortItems(safe);
  }

  async respond(token: string, approve: boolean) {
    const { data: estimate } = await this.admin
      .from('vendor_estimates')
      .select('*, vendor_accounts(business_name, phone)')
      .eq('public_token', token)
      .maybeSingle();
    if (!estimate || estimate.status === 'draft') {
      throw new NotFoundException('Estimate not found');
    }
    if (!['sent', 'viewed'].includes(estimate.status)) {
      throw new BadRequestException(
        estimate.status === 'approved' || estimate.status === 'converted'
          ? 'This estimate was already approved.'
          : 'This estimate can no longer be answered.',
      );
    }
    // One day of grace so server (UTC) time never expires an estimate hours early for a US client.
    if (estimate.expiration_date < addDays(-1)) {
      throw new ForbiddenException(
        'This estimate has expired. Ask the vendor for a new one.',
      );
    }
    const status = approve ? 'approved' : 'rejected';
    const { data: updated } = await this.admin
      .from('vendor_estimates')
      .update({
        status,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimate.id)
      .in('status', ['sent', 'viewed'])
      .select('id');
    if (!updated?.length) {
      throw new BadRequestException('This estimate can no longer be answered.');
    }
    try {
      await this.smsNotifications.vendorEstimateResponded(
        estimate.vendor_accounts?.phone,
        estimate.vendor_accounts?.business_name ?? 'Vendor',
        estimate.client_name,
        approve,
        estimate.total_amount,
      );
    } catch (err) {
      this.logger.warn(
        `Estimate response SMS failed: ${(err as Error).message}`,
      );
    }
    return { status };
  }

  // ─── Convert to invoice ─────────────────────────────────────────────────────

  async convertToInvoice(
    userId: string,
    estimateId: string,
    dto: ConvertVendorEstimateDto = {},
  ) {
    const estimate = await this.getOwned(userId, estimateId);
    if (estimate.status === 'converted' && estimate.converted_invoice_id) {
      return { invoice_id: estimate.converted_invoice_id, already: true };
    }
    if (!CONVERTIBLE_ESTIMATE_STATUSES.includes(estimate.status)) {
      throw new BadRequestException(
        `A ${estimate.status} estimate cannot be converted to an invoice.`,
      );
    }
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = dto.due_date || addDays(DEFAULT_INVOICE_TERMS_DAYS);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < addDays(-1)) {
      throw new BadRequestException(
        'Choose a due date that is not in the past.',
      );
    }

    // Claim the estimate first so a double click cannot create two invoices.
    const { data: claimed } = await this.admin
      .from('vendor_estimates')
      .update({ status: 'converted', updated_at: new Date().toISOString() })
      .eq('id', estimateId)
      .in('status', CONVERTIBLE_ESTIMATE_STATUSES)
      .select('id');
    if (!claimed?.length) {
      throw new BadRequestException(
        'This estimate was just converted. Refresh.',
      );
    }

    try {
      const invoice = await this.invoices.createInvoice(userId, {
        client_name: estimate.client_name,
        client_email: estimate.client_email ?? undefined,
        client_phone: estimate.client_phone ?? undefined,
        issue_date: today,
        due_date: dueDate,
        tax_rate: Number(estimate.tax_rate ?? 0),
        discount_amount: Number(estimate.discount_amount ?? 0),
        notes: estimate.notes ?? undefined,
        terms: estimate.terms ?? undefined,
        vendor_booking_id: estimate.vendor_booking_id ?? undefined,
        items: (estimate.vendor_estimate_items as any[]).map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      });
      await this.admin
        .from('vendor_estimates')
        .update({ converted_invoice_id: invoice.id })
        .eq('id', estimateId);
      return { invoice_id: invoice.id, already: false };
    } catch (err) {
      await this.admin
        .from('vendor_estimates')
        .update({ status: estimate.status })
        .eq('id', estimateId);
      throw err;
    }
  }
}
