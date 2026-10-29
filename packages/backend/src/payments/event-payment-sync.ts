import type { Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * After money is recorded on an owner invoice, marks the linked event booked (deposit paid) and sets its payment status.
 * Used for both Stripe payments and manual payments so the event always shows the same state.
 */
export async function syncEventAfterPayment(
  admin: SupabaseClient,
  logger: Pick<Logger, 'warn'>,
  eventId: string | null | undefined,
  amountPaid: number,
  isFullyPaid: boolean,
): Promise<void> {
  if (!eventId) return;
  const { data: event } = await admin
    .from('event')
    .select('client_status, deposit_paid_at')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return;

  const keepStatus = ['completed', 'cancelled'].includes(event.client_status);
  const { error } = await admin
    .from('event')
    .update({
      ...(keepStatus ? {} : { client_status: 'deposit_paid' }),
      deposit_paid: true,
      deposit_paid_at: event.deposit_paid_at ?? new Date().toISOString(),
      deposit_amount: amountPaid,
    })
    .eq('id', eventId);
  if (error) {
    logger.warn(
      `Could not mark event ${eventId} booked after payment: ${error.message}`,
    );
    return;
  }

  const { error: paymentStatusError } = await admin
    .from('event')
    .update({ payment_status: isFullyPaid ? 'paid' : 'deposit_paid' })
    .eq('id', eventId);
  if (paymentStatusError) {
    logger.warn(
      `Could not update payment status for event ${eventId}: ${paymentStatusError.message}`,
    );
  }
}
