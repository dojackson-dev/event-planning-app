import { EstimatesService } from './estimates.service';

function build() {
  return new EstimatesService({} as never, {} as never, {} as never);
}

describe('EstimatesService.addItems', () => {
  it('recalculates the estimate after lines are added, so the new lines count toward the total', async () => {
    const service = build();
    const created = [{ id: 'item-1', amount: 1750 }];
    const order: string[] = [];
    const createItems = jest
      .spyOn(service, 'createItems')
      .mockImplementation(() => {
        order.push('create');
        return Promise.resolve(created as never);
      });
    const recalculate = jest
      .spyOn(service, 'recalculate')
      .mockImplementation(() => {
        order.push('recalculate');
        return Promise.resolve({} as never);
      });
    const supabase = {} as never;

    await expect(
      service.addItems(supabase, 'est-1', [{ description: 'Weekend Rental' }]),
    ).resolves.toBe(created);
    expect(createItems).toHaveBeenCalledWith(supabase, 'est-1', [
      { description: 'Weekend Rental' },
    ]);
    expect(recalculate).toHaveBeenCalledWith(supabase, 'est-1');
    expect(order).toEqual(['create', 'recalculate']);
  });
});

describe('EstimatesService.updateItem', () => {
  function setup(current: Record<string, unknown>) {
    const service = build();
    jest.spyOn(service, 'recalculate').mockResolvedValue({} as never);
    const lookup = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: current, error: null }),
    };
    const write = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: { estimate_id: 'est-1' }, error: null }),
    };
    const supabase = {
      from: jest.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(write),
    };
    return { service, supabase, write };
  }

  it('keeps a fixed discount when only the quantity changes', async () => {
    const { service, supabase, write } = setup({
      quantity: 13,
      unit_price: 32,
      discount_type: 'fixed',
      discount_value: 100,
    });
    await service.updateItem(supabase as never, 'item-1', {
      quantity: 10,
    } as never);
    expect(write.update).toHaveBeenCalledWith({
      quantity: 10,
      subtotal: 320,
      discount_amount: 100,
      amount: 220,
    });
  });

  it('ignores fields that are not editable', async () => {
    const { service, supabase, write } = setup({
      quantity: 1,
      unit_price: 500,
      discount_type: 'none',
      discount_value: 0,
    });
    await service.updateItem(supabase as never, 'item-1', {
      unit_price: 450,
      estimate_id: 'someone-elses-estimate',
    } as never);
    expect(write.update).toHaveBeenCalledWith({
      unit_price: 450,
      subtotal: 450,
      discount_amount: 0,
      amount: 450,
    });
  });
});

/** A fake database where each table answers with the rows given, for single-row and list queries alike. */
function fakeDb(tables: Record<string, unknown>) {
  const from = jest.fn((table: string) => {
    const result = { data: tables[table] ?? null, error: null };
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'or', 'order'])
      query[method] = jest.fn(() => query);
    query.maybeSingle = jest.fn().mockResolvedValue(result);
    query.single = jest.fn().mockResolvedValue(result);
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);
    return query;
  });
  return { from } as never;
}

describe('EstimatesService access', () => {
  const team = [{ owner_accounts: { primary_owner_id: 'owner-2' } }];

  it('accepts the owner of the estimate', async () => {
    await expect(
      build().assertOwner(
        fakeDb({ estimates: { owner_id: 'owner-1', status: 'draft' } }),
        'est-1',
        'owner-1',
      ),
    ).resolves.toMatchObject({ status: 'draft' });
  });

  it("lets a team member work on their owner's estimate", async () => {
    await expect(
      build().assertOwner(
        fakeDb({
          estimates: { owner_id: 'owner-2', status: 'draft' },
          memberships: team,
        }),
        'est-1',
        'associate-1',
      ),
    ).resolves.toMatchObject({ status: 'draft' });
  });

  it('answers "not found" for someone else\'s estimate and for one that does not exist', async () => {
    const service = build();
    await expect(
      service.assertOwner(
        fakeDb({
          estimates: { owner_id: 'owner-3', status: 'draft' },
          memberships: team,
        }),
        'est-1',
        'associate-1',
      ),
    ).rejects.toThrow('Estimate not found');
    await expect(
      service.assertOwner(fakeDb({}), 'est-1', 'owner-1'),
    ).rejects.toThrow('Estimate not found');
  });

  it('resolves who an estimate belongs to: the team owner for an associate, the user for an account owner', async () => {
    const service = build();
    await expect(
      service.effectiveOwnerId(fakeDb({ memberships: team }), 'associate-1'),
    ).resolves.toBe('owner-2');
    await expect(
      service.effectiveOwnerId(
        fakeDb({ memberships: team, owner_accounts: { id: 'acct' } }),
        'owner-1',
      ),
    ).resolves.toBe('owner-1');
    await expect(service.effectiveOwnerId(fakeDb({}), 'owner-1')).resolves.toBe(
      'owner-1',
    );
  });

  it('refuses to create an estimate on behalf of an owner the user does not work for', async () => {
    await expect(
      build().create(fakeDb({ memberships: team }), 'associate-1', {
        owner_id: 'owner-3',
        client_name: 'X',
      } as never),
    ).rejects.toThrow('You can only create your own estimates');
  });

  it('returns nothing when the event belongs to another owner', async () => {
    const db = fakeDb({
      event: { id: 'ev-1', intake_form_id: null, owner_id: 'owner-3' },
      bookings: [],
    });
    await expect(build().findByEvent(db, 'ev-1', 'owner-1')).resolves.toEqual(
      [],
    );
    expect(
      (db as unknown as { from: jest.Mock }).from,
    ).not.toHaveBeenCalledWith('estimates');
  });
});

describe('EstimatesService locks sent estimates', () => {
  it.each(['sent', 'approved', 'rejected', 'expired', 'converted'])(
    'refuses edits to a %s estimate and says to create a new one',
    async (status) => {
      await expect(
        build().assertEditable(
          fakeDb({ estimates: { owner_id: 'owner-1', status } }),
          'est-1',
          'owner-1',
        ),
      ).rejects.toThrow('Create a new estimate instead');
    },
  );

  it('allows edits to a draft, including by a team member', async () => {
    const service = build();
    await expect(
      service.assertEditable(
        fakeDb({ estimates: { owner_id: 'owner-1', status: 'draft' } }),
        'est-1',
        'owner-1',
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.assertEditable(
        fakeDb({
          estimates: { owner_id: 'owner-2', status: 'draft' },
          memberships: [{ owner_accounts: { primary_owner_id: 'owner-2' } }],
        }),
        'est-1',
        'associate-1',
      ),
    ).resolves.toBeUndefined();
  });

  it('applies the same lock to a line item through its estimate', async () => {
    await expect(
      build().assertItemEditable(
        fakeDb({
          estimate_items: { estimate_id: 'est-1' },
          estimates: { owner_id: 'owner-1', status: 'sent' },
        }),
        'item-1',
        'owner-1',
      ),
    ).rejects.toThrow('can no longer be edited');
  });
});

describe('EstimatesService status changes', () => {
  it('does not let a sent estimate go back to draft', async () => {
    await expect(
      build().assertStatusChange(
        fakeDb({ estimates: { owner_id: 'owner-1', status: 'sent' } }),
        'est-1',
        'owner-1',
        'draft',
      ),
    ).rejects.toThrow('cannot go back to draft');
  });

  it('lets a sent estimate be approved, and a draft be sent', async () => {
    const service = build();
    await expect(
      service.assertStatusChange(
        fakeDb({ estimates: { owner_id: 'owner-1', status: 'sent' } }),
        'est-1',
        'owner-1',
        'approved',
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.assertStatusChange(
        fakeDb({ estimates: { owner_id: 'owner-1', status: 'draft' } }),
        'est-1',
        'owner-1',
        'sent',
      ),
    ).resolves.toBeUndefined();
  });
});
