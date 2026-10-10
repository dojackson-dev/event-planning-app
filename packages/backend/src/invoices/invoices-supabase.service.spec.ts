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
      from: jest.fn().mockReturnValueOnce(invoiceQuery).mockReturnValueOnce(deleteQuery),
    };

    await expect(
      service.delete(supabase as any, userId, invoiceId),
    ).resolves.toBeUndefined();
    expect(deleteQuery.delete).toHaveBeenCalledTimes(1);
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', invoiceId);
  });
});
