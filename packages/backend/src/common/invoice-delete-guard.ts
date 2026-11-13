import { BadRequestException } from '@nestjs/common';

/** Statuses where money has been taken or is on its way, so the record has to stay. */
const PAID_STATUSES = ['paid', 'processing', 'partial', 'refunded'];

/**
 * A payment that exists in Stripe must always have an invoice in the app to explain it.
 * Deleting a paid invoice leaves that money untraceable, so refuse and point to cancelling instead.
 */
export function assertNoPaymentOnInvoice(invoice: {
  status?: string | null;
  amount_paid?: number | string | null;
  stripe_payment_intent_id?: string | null;
}): void {
  if (
    PAID_STATUSES.includes(String(invoice.status ?? '')) ||
    Number(invoice.amount_paid ?? 0) > 0 ||
    invoice.stripe_payment_intent_id
  ) {
    throw new BadRequestException(
      'This invoice has a payment on it, so it cannot be deleted. Cancel it instead, or refund the payment first.',
    );
  }
}
