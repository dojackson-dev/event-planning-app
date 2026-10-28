import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StripeService } from './stripe.service';

function setup(stripeAccountId: string | null) {
  const maybeSingle = jest
    .fn()
    .mockResolvedValue({ data: { stripe_account_id: stripeAccountId } });
  const tables: string[] = [];
  const database = {
    from: (table: string) => {
      tables.push(table);
      const query: Record<string, jest.Mock> = {};
      query.select = jest.fn(() => query);
      query.eq = jest.fn(() => query);
      query.maybeSingle = maybeSingle;
      return query;
    },
  };
  const stripe = {
    accounts: {
      retrieve: jest
        .fn()
        .mockResolvedValue({ id: 'acct_1', payouts_enabled: true }),
      listExternalAccounts: jest.fn().mockResolvedValue({
        data: [
          {
            object: 'card',
            last4: '4242',
            available_payout_methods: ['standard', 'instant'],
          },
        ],
      }),
      createLoginLink: jest
        .fn()
        .mockResolvedValue({ url: 'https://connect.stripe.com/express/abc' }),
    },
  };
  const service = Object.create(StripeService.prototype) as StripeService;
  Object.assign(service, {
    supabaseService: { getAdminClient: () => database },
    stripe,
    logger: new Logger('test'),
  });
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  return { service, stripe, tables };
}

describe('instant payout readiness and payout settings link', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports not connected without calling Stripe when the user has no account', async () => {
    const { service, stripe } = setup(null);
    const result = await service.getInstantPayoutReadiness('u1', 'vendor');
    expect(result.state).toBe('not_connected');
    expect(stripe.accounts.retrieve).not.toHaveBeenCalled();
  });

  it('checks the signed-in vendor, artist and promoter in their own account table', async () => {
    for (const [role, table] of [
      ['vendor', 'vendor_accounts'],
      ['artist', 'artist_accounts'],
      ['promoter', 'promoter_accounts'],
    ] as const) {
      const { service, tables } = setup('acct_1');
      await service.getInstantPayoutReadiness('u1', role);
      expect(tables).toEqual([table]);
    }
  });

  it('reads the account and its payout destinations from Stripe', async () => {
    const { service, stripe } = setup('acct_1');
    const result = await service.getInstantPayoutReadiness('u1', 'vendor');
    expect(stripe.accounts.retrieve).toHaveBeenCalledWith('acct_1');
    expect(stripe.accounts.listExternalAccounts).toHaveBeenCalledWith(
      'acct_1',
      { limit: 20 },
    );
    expect(result).toMatchObject({ state: 'ready', debitCardLast4: '4242' });
  });

  it('fails softly when Stripe cannot be reached', async () => {
    const { service, stripe } = setup('acct_1');
    stripe.accounts.retrieve.mockRejectedValueOnce(new Error('network'));
    await expect(
      service.getInstantPayoutReadiness('u1', 'vendor'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('creates a Stripe dashboard link only for a connected account', async () => {
    const connected = setup('acct_1');
    await expect(
      connected.service.createPayoutSettingsLink('u1', 'vendor'),
    ).resolves.toEqual({ url: 'https://connect.stripe.com/express/abc' });
    expect(connected.stripe.accounts.createLoginLink).toHaveBeenCalledWith(
      'acct_1',
    );

    const none = setup(null);
    await expect(
      none.service.createPayoutSettingsLink('u1', 'vendor'),
    ).rejects.toThrow(BadRequestException);
    expect(none.stripe.accounts.createLoginLink).not.toHaveBeenCalled();
  });

  it('asks the user to finish Stripe setup when Stripe refuses the link', async () => {
    const { service, stripe } = setup('acct_1');
    stripe.accounts.createLoginLink.mockRejectedValueOnce(
      new Error('not onboarded'),
    );
    await expect(
      service.createPayoutSettingsLink('u1', 'vendor'),
    ).rejects.toThrow('Finish your Stripe setup');
  });
});
