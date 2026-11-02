import { BadRequestException } from '@nestjs/common';

export type StripeConnectRole = 'owner' | 'vendor' | 'artist' | 'promoter';

export type StripeConnectState = 'not_connected' | 'pending';

const WHERE: Record<StripeConnectRole, { label: string; path: string }> = {
  owner: {
    label: 'Settings → Payouts',
    path: '/dashboard/settings?tab=payouts',
  },
  vendor: { label: 'Payouts', path: '/vendors/dashboard/payouts' },
  artist: { label: 'your Artist dashboard', path: '/artist/dashboard' },
  promoter: {
    label: 'Profile → Payments',
    path: '/dashboard/promoter/profile',
  },
};

/** True only when the account has a Stripe account that finished registration and can take payments. */
export function isStripeReady(
  accountId: string | null | undefined,
  status: string | null | undefined,
): boolean {
  return !!accountId && status === 'active';
}

export function stripeConnectState(
  accountId: string | null | undefined,
): StripeConnectState {
  return accountId ? 'pending' : 'not_connected';
}

export function stripeRegistrationMessage(
  role: StripeConnectRole,
  state: StripeConnectState,
): string {
  const where = WHERE[role].label;
  if (state === 'pending') {
    return `Your Stripe registration is not finished yet. Open ${where} and click "Connect Bank Account" to continue registering with Stripe, then send this invoice again. Clients cannot pay you until Stripe confirms your account.`;
  }
  return `You need to register with Stripe before you can send invoices. Stripe is how clients pay you and how the money reaches your bank account. Open ${where}, click "Connect Bank Account" and complete the Stripe sign-up (about 5 minutes), then send this invoice again.`;
}

/**
 * Error for sending an invoice without a finished Stripe registration. The code and connectPath let the
 * screens show a "Register with Stripe" button instead of a bare error.
 */
export function stripeRegistrationRequired(
  role: StripeConnectRole,
  accountId: string | null | undefined,
): BadRequestException {
  const state = stripeConnectState(accountId);
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    code: 'STRIPE_REGISTRATION_REQUIRED',
    message: stripeRegistrationMessage(role, state),
    connectStatus: state,
    connectPath: WHERE[role].path,
  });
}
