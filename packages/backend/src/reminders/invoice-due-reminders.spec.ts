import { RemindersService } from './reminders.service';

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

function setup(rowsByTable: Record<string, any[]>) {
  const builder = (table: string) => {
    const chain: any = {
      select: () => chain,
      in: () => chain,
      gt: () => chain,
      gte: () => chain,
      then: (resolve: any) =>
        resolve({ data: rowsByTable[table] ?? [], error: null }),
    };
    return chain;
  };
  const supabase = {
    getAdminClient: () => ({ from: (table: string) => builder(table) }),
  };
  const mail = { sendReminderEmail: jest.fn().mockResolvedValue(undefined) };
  const sms = { paymentReminder: jest.fn().mockResolvedValue(undefined) };
  const service = new RemindersService(
    supabase as any,
    mail as any,
    sms as any,
  );
  return { service, mail, sms };
}

const base = {
  invoice_number: 'AINV-1',
  client_name: 'Casey',
  client_email: 'casey@example.com',
  client_phone: '+16015550100',
  public_token: 'tok',
  total_amount: 1000,
  amount_paid: 0,
  amount_due: 1000,
  artist_accounts: { stage_name: 'DJ Nova' },
};

describe('invoice due reminders', () => {
  it('reminds 7, 3 and 0 days out but not on other days', async () => {
    for (const [offset, expected] of [
      [7, 1],
      [3, 1],
      [0, 1],
      [5, 0],
      [1, 0],
    ] as const) {
      const { service, mail, sms } = setup({
        artist_invoices: [{ ...base, due_date: day(offset) }],
      });
      await service.sendInvoiceDueReminders();
      expect(mail.sendReminderEmail).toHaveBeenCalledTimes(expected);
      expect(sms.paymentReminder).toHaveBeenCalledTimes(expected);
    }
  });

  it('uses the deposit date until the deposit is paid, then the balance date', async () => {
    const unpaid = {
      ...base,
      deposit_amount: 300,
      due_date: day(7),
      balance_due_date: day(30),
    };
    const first = setup({ artist_invoices: [unpaid] });
    await first.service.sendInvoiceDueReminders();
    expect(first.sms.paymentReminder.mock.calls[0][2]).toBe(300);
    expect(first.mail.sendReminderEmail.mock.calls[0][0].body).toContain(
      'deposit',
    );

    const afterDeposit = {
      ...unpaid,
      amount_paid: 300,
      amount_due: 700,
      due_date: day(-20),
      balance_due_date: day(3),
    };
    const second = setup({ artist_invoices: [afterDeposit] });
    await second.service.sendInvoiceDueReminders();
    expect(second.sms.paymentReminder.mock.calls[0][2]).toBe(700);
    expect(second.mail.sendReminderEmail.mock.calls[0][0].body).toContain(
      'remaining balance',
    );
  });

  it('does not re-email a standalone owner invoice on its due date', async () => {
    const { service, mail, sms } = setup({
      invoices: [
        {
          ...base,
          invoice_number: 'INV-1',
          due_date: day(0),
          event_id: null,
          owner_id: 'owner-1',
        },
      ],
    });
    await service.sendInvoiceDueReminders();
    expect(sms.paymentReminder).toHaveBeenCalledTimes(1);
    expect(mail.sendReminderEmail).not.toHaveBeenCalled();
  });

  it('still emails owner invoices 7 days out', async () => {
    const { service, mail } = setup({
      invoices: [
        {
          ...base,
          invoice_number: 'INV-2',
          due_date: day(7),
          event_id: null,
          owner_id: 'owner-1',
        },
      ],
    });
    await service.sendInvoiceDueReminders();
    expect(mail.sendReminderEmail).toHaveBeenCalledTimes(1);
  });

  it('skips the email when the client has no email address', async () => {
    const { service, mail, sms } = setup({
      vendor_invoices: [
        {
          ...base,
          client_email: null,
          vendor_accounts: { business_name: 'Bloom Decor' },
          due_date: day(3),
        },
      ],
    });
    await service.sendInvoiceDueReminders();
    expect(sms.paymentReminder).toHaveBeenCalledTimes(1);
    expect(mail.sendReminderEmail).not.toHaveBeenCalled();
  });
});
