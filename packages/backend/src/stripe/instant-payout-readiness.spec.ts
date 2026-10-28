import type Stripe from 'stripe';
import { describeInstantPayouts } from './instant-payout-readiness';

function account(over: Record<string, unknown> = {}): Stripe.Account {
  return {
    id: 'acct_1',
    payouts_enabled: true,
    external_accounts: { data: [] },
    ...over,
  } as unknown as Stripe.Account;
}

describe('describeInstantPayouts', () => {
  it('reports not connected when there is no Stripe account', () => {
    expect(describeInstantPayouts(null).state).toBe('not_connected');
  });

  it('asks to finish Stripe setup until payouts are enabled', () => {
    const result = describeInstantPayouts(account({ payouts_enabled: false }));
    expect(result.state).toBe('setup_incomplete');
  });

  it('asks for a debit card when only a standard-payout bank account is on file', () => {
    const result = describeInstantPayouts(
      account({
        external_accounts: {
          data: [
            {
              object: 'bank_account',
              last4: '6789',
              available_payout_methods: ['standard'],
            },
          ],
        },
      }),
    );
    expect(result.state).toBe('needs_debit_card');
    expect(result.debitCardLast4).toBeNull();
  });

  it('asks for a debit card when nothing is on file or availability is unknown', () => {
    expect(describeInstantPayouts(account()).state).toBe('needs_debit_card');
    expect(
      describeInstantPayouts(
        account({
          external_accounts: {
            data: [
              { object: 'card', last4: '4242', available_payout_methods: null },
            ],
          },
        }),
      ).state,
    ).toBe('needs_debit_card');
  });

  it('is ready when a debit card supports instant payouts, and names its last four', () => {
    const result = describeInstantPayouts(
      account({
        external_accounts: {
          data: [
            {
              object: 'bank_account',
              last4: '6789',
              available_payout_methods: ['standard'],
            },
            {
              object: 'card',
              last4: '4242',
              available_payout_methods: ['standard', 'instant'],
            },
          ],
        },
      }),
    );
    expect(result.state).toBe('ready');
    expect(result.debitCardLast4).toBe('4242');
    expect(result.detail).toContain('4242');
  });

  it('says bank account, not debit card, when an eligible bank account supports instant payouts', () => {
    const result = describeInstantPayouts(
      account({
        external_accounts: {
          data: [
            {
              object: 'bank_account',
              last4: '6789',
              available_payout_methods: ['standard', 'instant'],
            },
          ],
        },
      }),
    );
    expect(result.state).toBe('ready');
    expect(result.debitCardLast4).toBeNull();
    expect(result.detail).toContain('bank account ending in 6789');
  });
});
