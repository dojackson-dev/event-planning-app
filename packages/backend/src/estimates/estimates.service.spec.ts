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

describe('EstimatesService ownership checks', () => {
  function lookup(row: Record<string, unknown> | null) {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
    };
    return { query, supabase: { from: jest.fn(() => query) } as never };
  }

  it('accepts the owner of the estimate', async () => {
    const service = build();
    const { supabase } = lookup({ owner_id: 'owner-1' });
    await expect(
      service.assertOwner(supabase, 'est-1', 'owner-1'),
    ).resolves.toBeUndefined();
  });

  it('answers "not found" for someone else\'s estimate and for one that does not exist', async () => {
    const service = build();
    await expect(
      service.assertOwner(
        lookup({ owner_id: 'owner-2' }).supabase,
        'est-1',
        'owner-1',
      ),
    ).rejects.toThrow('Estimate not found');
    await expect(
      service.assertOwner(lookup(null).supabase, 'est-1', 'owner-1'),
    ).rejects.toThrow('Estimate not found');
  });

  it('checks a line item through the estimate it belongs to', async () => {
    const service = build();
    const itemLookup = lookup({ estimate_id: 'est-1' });
    const estimateLookup = lookup({ owner_id: 'owner-2' });
    const supabase = {
      from: jest
        .fn()
        .mockReturnValueOnce(itemLookup.query)
        .mockReturnValueOnce(estimateLookup.query),
    } as never;
    await expect(
      service.assertItemOwner(supabase, 'item-1', 'owner-1'),
    ).rejects.toThrow('Estimate not found');
    expect(estimateLookup.query.eq).toHaveBeenCalledWith('id', 'est-1');
  });

  it('refuses to create an estimate on behalf of another owner', async () => {
    const service = build();
    await expect(
      service.create({} as never, 'owner-1', {
        owner_id: 'owner-2',
        client_name: 'X',
      } as never),
    ).rejects.toThrow('You can only create your own estimates');
  });

  it('returns nothing when the event belongs to another owner', async () => {
    const service = build();
    const event = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'ev-1', intake_form_id: null, owner_id: 'owner-2' },
      }),
    };
    const bookings = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [] }),
    };
    const supabase = {
      from: jest.fn((table: string) => (table === 'event' ? event : bookings)),
    } as never;
    await expect(
      service.findByEvent(supabase, 'ev-1', 'owner-1'),
    ).resolves.toEqual([]);
    expect(
      (supabase as unknown as { from: jest.Mock }).from,
    ).not.toHaveBeenCalledWith('estimates');
  });
});
