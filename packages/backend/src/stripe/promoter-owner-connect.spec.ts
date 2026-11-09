import { findOwnersActiveConnect } from './promoter-owner-connect';

type Row = Record<string, any> | null;

function fakeAdmin(opts: { primary?: Row; membership?: Row; ownerById?: Row }) {
  return {
    from: (table: string) => {
      const q: any = {};
      q.select = () => q;
      q.eq = () => q;
      q.maybeSingle = () => {
        if (table === 'owner_accounts') {
          // primary_owner_id lookups come first; id lookups only follow a membership
          return Promise.resolve({
            data: opts.primary ?? opts.ownerById ?? null,
          });
        }
        return Promise.resolve({ data: opts.membership ?? null });
      };
      return q;
    },
  };
}

const active = {
  details_submitted: true,
  charges_enabled: true,
  payouts_enabled: true,
};
const owner = {
  stripe_connect_id: 'acct_owner',
  stripe_connect_status: 'active',
};

describe('findOwnersActiveConnect', () => {
  it('returns the venue owner’s fully set up Stripe account', async () => {
    const stripe = {
      accounts: { retrieve: jest.fn().mockResolvedValue(active) },
    };
    await expect(
      findOwnersActiveConnect(fakeAdmin({ primary: owner }), stripe, 'u1'),
    ).resolves.toBe('acct_owner');
    expect(stripe.accounts.retrieve).toHaveBeenCalledWith('acct_owner');
  });

  it('finds the owner through an owner membership too', async () => {
    const stripe = {
      accounts: { retrieve: jest.fn().mockResolvedValue(active) },
    };
    await expect(
      findOwnersActiveConnect(
        fakeAdmin({ membership: { owner_account_id: 'o1' }, ownerById: owner }),
        stripe,
        'u1',
      ),
    ).resolves.toBe('acct_owner');
  });

  it('does not hand a venue’s account to someone who is not its owner', async () => {
    const stripe = { accounts: { retrieve: jest.fn() } };
    await expect(
      findOwnersActiveConnect(fakeAdmin({}), stripe, 'team-member'),
    ).resolves.toBeNull();
    expect(stripe.accounts.retrieve).not.toHaveBeenCalled();
  });

  it('ignores an owner account that is not active', async () => {
    const stripe = { accounts: { retrieve: jest.fn() } };
    await expect(
      findOwnersActiveConnect(
        fakeAdmin({ primary: { ...owner, stripe_connect_status: 'pending' } }),
        stripe,
        'u1',
      ),
    ).resolves.toBeNull();
    await expect(
      findOwnersActiveConnect(
        fakeAdmin({
          primary: {
            stripe_connect_id: null,
            stripe_connect_status: 'not_connected',
          },
        }),
        stripe,
        'u1',
      ),
    ).resolves.toBeNull();
  });

  it('needs Stripe to confirm the account can take payments and pay out', async () => {
    const disabled = {
      accounts: {
        retrieve: jest
          .fn()
          .mockResolvedValue({ ...active, payouts_enabled: false }),
      },
    };
    await expect(
      findOwnersActiveConnect(fakeAdmin({ primary: owner }), disabled, 'u1'),
    ).resolves.toBeNull();
    const failing = {
      accounts: { retrieve: jest.fn().mockRejectedValue(new Error('network')) },
    };
    await expect(
      findOwnersActiveConnect(fakeAdmin({ primary: owner }), failing, 'u1'),
    ).resolves.toBeNull();
  });
});
