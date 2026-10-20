import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices-supabase.service';

describe('InvoicesService.delete', () => {
  const service = new InvoicesService({} as any, {} as any, {} as any);
  const userId = 'owner-123';
  const invoiceId = 'invoice-123';

  it('rejects deleting a sent invoice so its history is preserved', async () => {
    const invoiceQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: invoiceId, status: 'sent', amount_paid: 0 },
        error: null,
      }),
    };
    const supabase = { from: jest.fn().mockReturnValue(invoiceQuery) };

    await expect(
      service.delete(supabase as any, userId, invoiceId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(invoiceQuery.single).toHaveBeenCalledTimes(1);
  });

  it('deletes an unpaid draft invoice', async () => {
    const invoiceQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: invoiceId, status: 'draft', amount_paid: 0 },
        error: null,
      }),
    };
    const deleteQuery = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      from: jest
        .fn()
        .mockReturnValueOnce(invoiceQuery)
        .mockReturnValueOnce(deleteQuery),
    };

    await expect(
      service.delete(supabase as any, userId, invoiceId),
    ).resolves.toBeUndefined();
    expect(deleteQuery.delete).toHaveBeenCalledTimes(1);
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', invoiceId);
  });
});

describe('InvoicesService.updateInvoiceItem', () => {
  function setup(current: Record<string, unknown>) {
    const service = new InvoicesService({} as any, {} as any, {} as any);
    const recalc = jest.fn().mockResolvedValue({});
    (service as any).recalculateInvoice = recalc;
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
        .mockResolvedValue({ data: { invoice_id: 'inv-1' }, error: null }),
    };
    const supabase = {
      from: jest.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(write),
    };
    return { service, supabase, write, recalc };
  }

  it('keeps a percentage discount when only the quantity changes', async () => {
    const { service, supabase, write, recalc } = setup({
      quantity: 1,
      unit_price: 1000,
      discount_type: 'percentage',
      discount_value: 10,
    });
    await service.updateInvoiceItem(supabase as any, 'owner-1', 'item-1', {
      quantity: 2,
    } as any);
    expect(write.update).toHaveBeenCalledWith({
      quantity: 2,
      subtotal: 2000,
      discount_amount: 200,
      amount: 1800,
    });
    expect(recalc).toHaveBeenCalledWith(supabase, 'owner-1', 'inv-1');
  });

  it('applies a new fixed discount and ignores fields that are not editable', async () => {
    const { service, supabase, write } = setup({
      quantity: 3,
      unit_price: 100,
      discount_type: 'none',
      discount_value: 0,
    });
    await service.updateInvoiceItem(supabase as any, 'owner-1', 'item-1', {
      discount_type: 'fixed',
      discount_value: 50,
      invoice_id: 'someone-elses-invoice',
    } as any);
    expect(write.update).toHaveBeenCalledWith({
      discount_type: 'fixed',
      discount_value: 50,
      subtotal: 300,
      discount_amount: 50,
      amount: 250,
    });
  });

  it('removes the discount when the type is set to none', async () => {
    const { service, supabase, write } = setup({
      quantity: 1,
      unit_price: 500,
      discount_type: 'fixed',
      discount_value: 75,
    });
    await service.updateInvoiceItem(supabase as any, 'owner-1', 'item-1', {
      discount_type: 'none',
      discount_value: 0,
    } as any);
    expect(write.update).toHaveBeenCalledWith({
      discount_type: 'none',
      discount_value: 0,
      subtotal: 500,
      discount_amount: 0,
      amount: 500,
    });
  });
});

describe('InvoicesService.recalculateInvoice after a payment', () => {
  function setup(
    items: Array<{ amount: number }>,
    invoice: Record<string, unknown>,
  ) {
    const service = new InvoicesService({} as any, {} as any, {} as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(invoice as any);
    jest.spyOn(service, 'findInvoiceItems').mockResolvedValue(items as any);
    const write = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    const supabase = { from: jest.fn().mockReturnValue(write) };
    return { service, supabase, write };
  }

  it('keeps the deposit and raises the balance when services are added', async () => {
    const { service, supabase, write } = setup(
      [{ amount: 1500 }, { amount: 500 }],
      { tax_rate: 0, discount_amount: 0, amount_paid: 500 },
    );
    await service.recalculateInvoice(supabase as any, 'owner-1', 'inv-1');
    expect(write.update).toHaveBeenCalledWith({
      subtotal: 2000,
      tax_amount: 0,
      total_amount: 2000,
      amount_due: 1500,
    });
  });

  it('never records a negative balance', async () => {
    const { service, supabase, write } = setup([{ amount: 300 }], {
      tax_rate: 0,
      discount_amount: 0,
      amount_paid: 500,
    });
    await service.recalculateInvoice(supabase as any, 'owner-1', 'inv-1');
    expect(write.update).toHaveBeenCalledWith(
      expect.objectContaining({ total_amount: 300, amount_due: 0 }),
    );
  });
});
