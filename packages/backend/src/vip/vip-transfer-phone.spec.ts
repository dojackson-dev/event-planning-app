import { BadRequestException } from '@nestjs/common';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import { VipService } from './vip.service';

function setup(order: Record<string, unknown> = {}) {
  const db = new FakeDb({
    vip_orders: [
      {
        id: 'o1',
        qr_code: 'QR1',
        buyer_email: 'buyer@example.com',
        payment_status: 'paid',
        check_in_status: 'not_checked_in',
        public_event_id: 'e1',
        vip_packages: { name: 'Table for 4' },
        public_events: { title: 'Gala', event_date: '2026-12-01' },
        ...order,
      },
    ],
  });
  const sms = { sendOne: jest.fn().mockResolvedValue(true) };
  const service = new VipService(
    { getAdminClient: () => db } as any,
    {
      get: (k: string) =>
        k === 'FRONTEND_URL' ? 'https://www.eventecos.com' : 'sk_test_dummy',
    } as any,
    sms as any,
    {} as any,
  );
  return { db, sms, service };
}

describe('transferring a VIP ticket by phone', () => {
  it('records the new holder and texts them the ticket link', async () => {
    const { db, sms, service } = setup();
    const result = await service.transferVipOrder('QR1', '601 555 0144', 'Sam');
    expect(result.success).toBe(true);
    expect(result.sms_sent).toBe(true);
    expect(db.rows('vip_orders')[0]).toMatchObject({
      buyer_phone: '+16015550144',
      buyer_name: 'Sam',
      buyer_email: 'buyer@example.com',
    });
    const [to, body] = sms.sendOne.mock.calls[0];
    expect(to).toBe('+16015550144');
    expect(body).toContain('https://www.eventecos.com/vip/order/QR1');
  });

  it('reports when the text could not be sent', async () => {
    const { sms, service } = setup();
    sms.sendOne.mockResolvedValue(false);
    const result = await service.transferVipOrder('QR1', '6015550144');
    expect(result.sms_sent).toBe(false);
    expect(result.message).toContain('could not be sent');
  });

  it('needs a valid phone, a paid order and an unused ticket', async () => {
    await expect(
      setup().service.transferVipOrder('QR1', 'not-a-phone'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      setup({ payment_status: 'pending' }).service.transferVipOrder(
        'QR1',
        '6015550144',
      ),
    ).rejects.toThrow('Only paid orders');
    await expect(
      setup({ check_in_status: 'checked_in' }).service.transferVipOrder(
        'QR1',
        '6015550144',
      ),
    ).rejects.toThrow('already been used');
  });
});
