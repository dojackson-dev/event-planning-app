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
