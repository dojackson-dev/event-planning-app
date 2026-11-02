import {
  isStripeReady,
  stripeConnectState,
  stripeRegistrationMessage,
  stripeRegistrationRequired,
} from './stripe-connect-guard';

describe('stripe connect guard', () => {
  it('is ready only with an account id and active status', () => {
    expect(isStripeReady('acct_1', 'active')).toBe(true);
    expect(isStripeReady('acct_1', 'pending')).toBe(false);
    expect(isStripeReady(null, 'active')).toBe(false);
    expect(isStripeReady(undefined, undefined)).toBe(false);
  });

  it('tells apart a never-registered account from an unfinished one', () => {
    expect(stripeConnectState(null)).toBe('not_connected');
    expect(stripeConnectState('acct_1')).toBe('pending');
  });

  it('says explicitly to register with Stripe and where, per role', () => {
    expect(stripeRegistrationMessage('owner', 'not_connected')).toContain(
      'register with Stripe',
    );
    expect(stripeRegistrationMessage('owner', 'not_connected')).toContain(
      'Settings → Payouts',
    );
    expect(stripeRegistrationMessage('vendor', 'not_connected')).toContain(
      'Payouts',
    );
    expect(stripeRegistrationMessage('promoter', 'pending')).toContain(
      'not finished',
    );
  });

  it('carries a code and connect path for the screens', () => {
    const err = stripeRegistrationRequired('artist', null);
    expect(err.getStatus()).toBe(400);
    expect(err.getResponse()).toMatchObject({
      code: 'STRIPE_REGISTRATION_REQUIRED',
      connectStatus: 'not_connected',
      connectPath: '/artist/dashboard',
    });
  });
});
