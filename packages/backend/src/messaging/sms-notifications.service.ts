import { Injectable, Logger } from '@nestjs/common';
import { TwilioService } from './twilio.service';

/**
 * Central SMS notification hub.
 *
 * Every outbound notification triggered by an owner or vendor action is routed
 * through this service.  All methods accept a nullable `phone` parameter and
 * silently skip sending if it is absent, so callers never need to guard against
 * missing phone numbers.
 */
@Injectable()
export class SmsNotificationsService {
  private readonly logger = new Logger(SmsNotificationsService.name);

  constructor(private readonly twilioService: TwilioService) {}

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
    const link = payUrl ? ` Pay securely here: ${payUrl}` : '';
    await this.trySend(
      phone,
      `Hi ${clientName}, invoice ${invoiceNumber} for ${amt} has been sent to you.${link}`,
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
      `Hi ${clientName}, your payment of ${amt} for invoice ${invoiceNumber} has been received. Thank you!`,
    );
  }

  async invoiceUpdated(
    phone: string | null | undefined,
    clientName: string,
    invoiceNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Hi ${clientName}, invoice ${invoiceNumber} has been updated. Log in to view the latest details.`,
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
      `Hi ${clientName}, invoice ${invoiceNumber} for ${amt} is now past due. Please make payment at your earliest convenience.`,
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
      `Hi ${clientName}, a payment of ${paid} has been recorded on invoice ${invoiceNumber}. Remaining balance: ${remaining}.`,
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
      `Hi ${clientName}, estimate ${estimateNumber} for ${amt} has been sent for your review. Log in to approve or decline.`,
    );
  }

  async estimateApproved(
    phone: string | null | undefined,
    notifyName: string,
    estimateNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Great news! Estimate ${estimateNumber} has been approved by ${notifyName}.`,
    );
  }

  async estimateRejected(
    phone: string | null | undefined,
    clientName: string,
    estimateNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Hi ${clientName}, estimate ${estimateNumber} has been declined. Please contact us if you have questions.`,
    );
  }

  async estimateUpdated(
    phone: string | null | undefined,
    clientName: string,
    estimateNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Hi ${clientName}, estimate ${estimateNumber} has been updated. Log in to review the changes.`,
    );
  }

  async estimateExpired(
    phone: string | null | undefined,
    clientName: string,
    estimateNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Hi ${clientName}, estimate ${estimateNumber} has expired. Please contact us to request a new one.`,
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
      `Hi ${clientName}, contract ${contractNumber} is ready for your review and signature. Log in to your portal to sign.`,
    );
  }

  async contractSigned(
    phone: string | null | undefined,
    clientName: string,
    contractNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Contract ${contractNumber} has been signed by ${clientName}. Check your portal for the signed copy.`,
    );
  }

  async contractUpdated(
    phone: string | null | undefined,
    clientName: string,
    contractNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Hi ${clientName}, contract ${contractNumber} has been updated. Log in to review the changes.`,
    );
  }

  async contractSignedConfirmToClient(
    phone: string | null | undefined,
    signerName: string,
    contractNumber: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Hi ${signerName}, you have successfully signed contract ${contractNumber}. A copy is available in your portal.`,
    );
  }

  /**
   * Generic send – use only when no typed method fits.
   */
  async send(phone: string | null | undefined, body: string): Promise<void> {
    await this.trySend(phone, body);
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
      `Hi ${name}, you have been assigned to security for "${eventName}" on ${date}${loc}. Please confirm your availability.`,
    );
  }

  async securityUpdated(
    phone: string | null | undefined,
    name: string,
    eventName: string,
  ): Promise<void> {
    await this.trySend(
      phone,
      `Hi ${name}, your security assignment for "${eventName}" has been updated. Log in to view the details.`,
    );
  }

  async securityArrivalRecorded(
    phone: string | null | undefined,
    name: string,
    eventName: string,
  ): Promise<void> {
    await this.trySend(phone, `Arrival confirmed for ${name} at "${eventName}".`);
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
      `New booking request for ${vendorName}! Event: "${eventName}" on ${date}${amt}. Log in to confirm or decline.`,
    );
  }

  async vendorBookingStatusChanged(
    phone: string | null | undefined,
    recipientName: string,
    eventName: string,
    status: string,
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
    await this.trySend(phone, `Hi ${recipientName}, ${msg}`);
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
        `Hi ${clientName}, great news! ${vendorName} has confirmed your booking request${amt}.`,
      );
    } else if (status === 'declined') {
      await this.trySend(
        phone,
        `Hi ${clientName}, ${vendorName} is unable to accommodate your booking request at this time.`,
      );
    } else {
      await this.trySend(
        phone,
        `Hi ${clientName}, your booking request with ${vendorName} has been updated to: ${status}${amt}.`,
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
    const link = payUrl ? ` Pay here: ${payUrl}` : '';
    await this.trySend(
      phone,
      `Hi ${clientName}, you have an invoice for ${amt} from ${vendorName}.${link}`,
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
      `Payment of ${amt} received from ${clientName}. Your invoice has been marked as paid. — ${vendorName}`,
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
      `Hi ${clientName}, your invoice ${invoiceNumber} from ${vendorName} has been updated. Log in to view the changes.`,
    );
  }

  // ─── MESSAGES / CHAT ──────────────────────────────────────────────────────

  async newMessageReceived(
    phone: string | null | undefined,
    recipientName: string,
    senderName: string,
    preview?: string,
  ): Promise<void> {
    const snippet =
      preview
        ? `: "${preview.substring(0, 80)}${preview.length > 80 ? '...' : ''}"`
        : '';
    await this.trySend(
      phone,
      `Hi ${recipientName}, you have a new message from ${senderName}${snippet}. Log in to reply.`,
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
      `Hi ${clientName}, your payment of ${amt} for ${reference} has been received. Thank you!`,
    );
  }

  async paymentReminder(
    phone: string | null | undefined,
    clientName: string,
    amount: number,
    dueDate: string,
    reference: string,
  ): Promise<void> {
    const amt = `$${Number(amount).toFixed(2)}`;
    await this.trySend(
      phone,
      `Hi ${clientName}, a friendly reminder that ${amt} for ${reference} is due on ${dueDate}.`,
    );
  }
}
