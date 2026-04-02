import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from './twilio.service';

/**
 * Central SMS notification hub.
 *
 * Every outbound notification triggered by an owner or vendor action is routed
 * through this service.  All methods accept a nullable `phone` parameter and
 * silently skip sending if it is absent, so callers never need to guard against
 * missing phone numbers.
 *
 * Every message includes a relevant deep-link so the recipient can log in and
 * act immediately.
 */
@Injectable()
export class SmsNotificationsService {
  private readonly logger = new Logger(SmsNotificationsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly twilioService: TwilioService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://dovenuesuite.com');
  }

  // ─── URL helpers ──────────────────────────────────────────────────────────

  private url(path: string): string {
    return `${this.frontendUrl}${path}`;
  }

  // ─── Internal helper ──────────────────────────────────────────────────────

  private async trySend(to: string | null | undefined, body: string): Promise<void> {
    if (!to) return;
    try {
      await this.twilioService.sendSMS(to, body);
    } catch (err: any) {
      this.logger.warn(`SMS notification failed to ${to}: ${err?.message ?? err}`);
    }
  }

  // ─── INVOICES ─────────────────────────────────────────────────────────────

  async invoiceSent(
    phone: string | null | undefined,
    clientName: string,
    invoiceNumber: string,
    amount: number,
    payUrl?: string,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    const link = payUrl ?? this.url('/client-portal');
    await this.trySend(
      phone,
      `DoVenue Suite Invoice Message\nHi ${clientName}, invoice ${invoiceNumber} for ${amt} has been sent to you. View & pay here: ${link}`,
    );
  }

  async invoicePaid(
    phone: string | null | undefined,
    clientName: string,
    invoiceNumber: string,
    amount: number,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    await this.trySend(
      phone,
      `DoVenue Suite Invoice Message\nHi ${clientName}, your payment of ${amt} for invoice ${invoiceNumber} has been received. Thank you! View your records: ${this.url('/client-portal')}`,

    );
  }

  async invoiceUpdated(
    phone: string | null | undefined,
    clientName: string,
    invoiceNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Invoice Message\nHi ${clientName}, invoice ${invoiceNumber} has been updated. Log in to view the latest details: ${this.url('/client-portal')}`,

    );
  }

  async invoiceOverdue(
    phone: string | null | undefined,
    clientName: string,
    invoiceNumber: string,
    amount: number,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    await this.trySend(
      phone,
      `DoVenue Suite Invoice Message\nHi ${clientName}, invoice ${invoiceNumber} for ${amt} is now past due. Please make payment: ${this.url('/client-portal')}`,

    );
  }

  async invoicePartialPayment(
    phone: string | null | undefined,
    clientName: string,
    invoiceNumber: string,
    paidAmount: number,
    remainingAmount: number,
  ): Promise<void> {
    const paid = `$${Number(paidAmount).toFixed(2)}`;
    const remaining = `$${Number(remainingAmount).toFixed(2)}`;
    await this.trySend(
      phone,
      `DoVenue Suite Invoice Message\nHi ${clientName}, a payment of ${paid} has been recorded on invoice ${invoiceNumber}. Remaining balance: ${remaining}. Log in: ${this.url('/client-portal')}`,

    );
  }

  // ─── ESTIMATES ────────────────────────────────────────────────────────────

  async estimateSent(
    phone: string | null | undefined,
    clientName: string,
    estimateNumber: string,
    amount: number,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    await this.trySend(
      phone,
      `DoVenue Suite Estimate Message\nHi ${clientName}, estimate ${estimateNumber} for ${amt} is ready for your review. Approve or decline here: ${this.url('/client-portal/estimates')}`,

    );
  }

  async estimateApproved(
    phone: string | null | undefined,
    notifyName: string,
    estimateNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Estimate Message\nGreat news! Estimate ${estimateNumber} has been approved by ${notifyName}. Log in to view: ${this.url('/dashboard')}`,

    );
  }

  async estimateRejected(
    phone: string | null | undefined,
    clientName: string,
    estimateNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Estimate Message\nHi ${clientName}, estimate ${estimateNumber} has been declined. Contact us with any questions. View details: ${this.url('/client-portal/estimates')}`,

    );
  }

  async estimateUpdated(
    phone: string | null | undefined,
    clientName: string,
    estimateNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Estimate Message\nHi ${clientName}, estimate ${estimateNumber} has been updated. Review the changes: ${this.url('/client-portal/estimates')}`,

    );
  }

  async estimateExpired(
    phone: string | null | undefined,
    clientName: string,
    estimateNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Estimate Message\nHi ${clientName}, estimate ${estimateNumber} has expired. Please contact us to request a new one. View your estimates: ${this.url('/client-portal/estimates')}`,

    );
  }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────

  async contractSent(
    phone: string | null | undefined,
    clientName: string,
    contractNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Contract Message\nHi ${clientName}, contract ${contractNumber} is ready for your signature. Sign here: ${this.url('/client-portal/contracts')}`,

    );
  }

  async contractSigned(
    phone: string | null | undefined,
    clientName: string,
    contractNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Contract Message\nContract ${contractNumber} has been signed by ${clientName}. Log in to view the signed copy: ${this.url('/dashboard')}`,

    );
  }

  async contractUpdated(
    phone: string | null | undefined,
    clientName: string,
    contractNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Contract Message\nHi ${clientName}, contract ${contractNumber} has been updated. Log in to review the changes: ${this.url('/client-portal/contracts')}`,

    );
  }

  async contractSignedConfirmToClient(
    phone: string | null | undefined,
    signerName: string,
    contractNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Contract Message\nHi ${signerName}, you have successfully signed contract ${contractNumber}. View your copy here: ${this.url('/client-portal/contracts')}`,

    );
  }

  // ─── SECURITY PERSONNEL ──────────────────────────────────────────────────

  async securityAssigned(
    phone: string | null | undefined,
    name: string,
    eventName: string,
    date: string,
    location?: string,
  ): Promise<void> {
    const loc = location ? ` at ${location}` : '';
    await this.trySend(
      phone,
      `DoVenue Suite Security Message\nHi ${name}, you have been assigned to security for "${eventName}" on ${date}${loc}. Please confirm your availability. Log in: ${this.url('/vendor-portal/login')}`,

    );
  }

  async securityUpdated(
    phone: string | null | undefined,
    name: string,
    eventName: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Security Message\nHi ${name}, your security assignment for "${eventName}" has been updated. Log in to view the details: ${this.url('/vendor-portal/login')}`,

    );
  }

  async securityArrivalRecorded(
    phone: string | null | undefined,
    name: string,
    eventName: string,
  ): Promise<void> {
    await this.trySend(phone, `DoVenue Suite Security Message\nArrival confirmed for ${name} at "${eventName}". View your portal: ${this.url('/vendor-portal')}`);
  }

  // ─── VENDOR BOOKINGS ──────────────────────────────────────────────────────

  async vendorBookingCreated(
    phone: string | null | undefined,
    vendorName: string,
    eventName: string,
    date: string,
    amount?: number,
  ): Promise<void> {
    const amt = amount ? ` — Agreed amount: $${Number(amount).toLocaleString()}` : '';
    await this.trySend(
      phone,
      `DoVenue Suite Booking Message\nNew booking request for ${vendorName}! Event: "${eventName}" on ${date}${amt}. Confirm or decline here: ${this.url('/vendor-portal')}`,

    );
  }

  async vendorBookingStatusChanged(
    phone: string | null | undefined,
    recipientName: string,
    eventName: string,
    status: string,
    isVendor = false,
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      confirmed: `Your booking for "${eventName}" has been confirmed!`,
      declined: `Your booking request for "${eventName}" has been declined.`,
      cancelled: `Your booking for "${eventName}" has been cancelled.`,
      completed: `Your booking for "${eventName}" has been marked as completed.`,
      paid: `Payment for your booking at "${eventName}" has been received. Thank you!`,
    };
    const msg =
      statusMessages[status] ??
      `Your booking for "${eventName}" has been updated to: ${status}.`;
    const portalLink = isVendor
      ? this.url('/vendor-portal')
      : this.url('/client-portal');
    await this.trySend(phone, `DoVenue Suite Booking Message\nHi ${recipientName}, ${msg} View details: ${portalLink}`);
  }

  async vendorBookingRequestUpdated(
    phone: string | null | undefined,
    clientName: string,
    status: string,
    vendorName: string,
    quotedAmount?: number,
  ): Promise<void> {
    const amt =
      quotedAmount != null ? ` (Quoted: $${Number(quotedAmount).toFixed(2)})` : '';
    if (status === 'confirmed') {
      await this.trySend(
        phone,
        `DoVenue Suite Booking Message\nHi ${clientName}, great news! ${vendorName} has confirmed your booking request${amt}. Log in to your portal: ${this.url('/client-portal')}`,

      );
    } else if (status === 'declined') {
      await this.trySend(
        phone,
        `DoVenue Suite Booking Message\nHi ${clientName}, ${vendorName} is unable to accommodate your booking request at this time. View details: ${this.url('/client-portal')}`,

      );
    } else {
      await this.trySend(
        phone,
        `DoVenue Suite Booking Message\nHi ${clientName}, your booking request with ${vendorName} has been updated to: ${status}${amt}. Log in: ${this.url('/client-portal')}`,

      );
    }
  }

  // ─── VENDOR INVOICES ──────────────────────────────────────────────────────

  async vendorInvoiceSent(
    phone: string | null | undefined,
    clientName: string,
    vendorName: string,
    amount: number,
    payUrl?: string,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    const link = payUrl ?? this.url('/client-portal');
    await this.trySend(
      phone,
      `DoVenue Suite Vendor Invoice Message\nHi ${clientName}, you have an invoice for ${amt} from ${vendorName}. Pay here: ${link}`,

    );
  }

  async vendorInvoicePaid(
    phone: string | null | undefined,
    vendorName: string,
    clientName: string,
    amount: number,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    await this.trySend(
      phone,
      `DoVenue Suite Vendor Invoice Message\nPayment of ${amt} received from ${clientName}. Your invoice has been marked as paid. View your invoices: ${this.url('/vendor-portal/invoices')} — ${vendorName}`,

    );
  }

  async vendorInvoiceUpdated(
    phone: string | null | undefined,
    clientName: string,
    vendorName: string,
    invoiceNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Vendor Invoice Message\nHi ${clientName}, your invoice ${invoiceNumber} from ${vendorName} has been updated. Log in to view: ${this.url('/client-portal')}`,

    );
  }

  // ─── MESSAGES / CHAT ──────────────────────────────────────────────────────

  async newMessageReceived(
    phone: string | null | undefined,
    recipientName: string,
    senderName: string,
    preview?: string,
    isVendor = false,
  ): Promise<void> {
    const snippet =
      preview
        ? `: "${preview.substring(0, 80)}${preview.length > 80 ? '...' : ''}"`
        : '';
    const portalLink = isVendor
      ? this.url('/vendor-portal')
      : this.url('/client-portal/messages');
    await this.trySend(
      phone,
      `DoVenue Suite Message\nHi ${recipientName}, you have a new message from ${senderName}${snippet}. Reply here: ${portalLink}`,

    );
  }

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────

  async paymentReceived(
    phone: string | null | undefined,
    clientName: string,
    amount: number,
    reference: string,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    await this.trySend(
      phone,
      `DoVenue Suite Payment Message\nHi ${clientName}, your payment of ${amt} for ${reference} has been received. Thank you! View your portal: ${this.url('/client-portal')}`,

    );
  }

  async paymentReminder(
    phone: string | null | undefined,
    clientName: string,
    amount: number,
    dueDate: string,
    reference: string,
    payUrl?: string,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    const link = payUrl ?? this.url('/client-portal');
    await this.trySend(
      phone,
      `DoVenue Suite Payment Message\nHi ${clientName}, a friendly reminder that ${amt} for ${reference} is due on ${dueDate}. Pay here: ${link}`,

    );
  }

  // ─── INTAKE FORMS ─────────────────────────────────────────────────────────

  async newIntakeFormSubmission(
    phone: string | null | undefined,
    clientName: string,
    eventType: string,
    eventDate: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `DoVenue Suite Client Message\nNew intake form submitted by ${clientName} for a ${eventType} event on ${eventDate}. Log in to review: ${this.url('/dashboard/clients')}`,
    );
  }

  // ─── VENDOR REVIEWS ──────────────────────────────────────────────────────

  async vendorReviewReceived(
    phone: string | null | undefined,
    vendorName: string,
    rating: number,
    vendorAccountId: string,
  ): Promise<void> {
    const stars = '⭐'.repeat(Math.min(5, Math.max(1, rating)));
    await this.trySend(
      phone,
      `DoVenue Suite Review Message\nHi ${vendorName}, you just received a new ${stars} review! See it here: ${this.url(`/vendors/${vendorAccountId}`)}`,
    );
  }

  /**
   * Generic send — use only when no typed method fits.
   */
  async send(phone: string | null | undefined, body: string): Promise<void> {
    await this.trySend(phone, body);
  }
}

