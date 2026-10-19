import {
  applyCredit,
  creditCentsFor,
  depositRemainingCents,
  hasDeposit,
  nextPaymentDue,
  normalizePayAmount,
  validateDeposit,
} from './invoice-deposit';

const invoice = {
  total_amount: 1000,
  amount_paid: 0,
  amount_due: 1000,
  deposit_amount: 300,
  due_date: '2026-11-01',
  balance_due_date: '2026-12-01',
};

describe('invoice deposits', () => {
  it('ignores invoices without a deposit so legacy invoices pay in full', () => {
    const legacy = { total_amount: 500, amount_paid: 0, amount_due: 500 };
    expect(hasDeposit(legacy)).toBe(false);
    expect(creditCentsFor(legacy, 'deposit')).toBe(50000);
    expect(nextPaymentDue({ ...legacy, due_date: '2026-11-01' })).toEqual({
      kind: 'full',
      date: '2026-11-01',
      cents: 50000,
    });
  });

  it('treats a deposit that is not below the total as no deposit', () => {
    expect(hasDeposit({ ...invoice, deposit_amount: 1000 })).toBe(false);
    expect(hasDeposit({ ...invoice, deposit_amount: 0 })).toBe(false);
  });

  it('charges the deposit when chosen and the full amount otherwise', () => {
    expect(creditCentsFor(invoice, 'deposit')).toBe(30000);
    expect(creditCentsFor(invoice, 'full')).toBe(100000);
  });

  it('falls back to the amount due once the deposit is covered', () => {
    const afterDeposit = { ...invoice, amount_paid: 300, amount_due: 700 };
    expect(depositRemainingCents(afterDeposit)).toBe(0);
    expect(creditCentsFor(afterDeposit, 'deposit')).toBe(70000);
  });

  it('credits a deposit as a partial payment and the balance as the rest', () => {
    const afterDeposit = applyCredit(invoice, 30000);
    expect(afterDeposit).toEqual({
      fullyPaid: false,
      amount_paid: 300,
      amount_due: 700,
    });
    expect(
      applyCredit({ ...invoice, amount_paid: 300, amount_due: 700 }, 70000),
    ).toEqual({ fullyPaid: true, amount_paid: 1000, amount_due: 0 });
  });

  it('never credits more than the invoice total', () => {
    expect(applyCredit(invoice, 999999).amount_paid).toBe(1000);
  });

  it('points reminders at the deposit date, then the balance date', () => {
    expect(nextPaymentDue(invoice)).toEqual({
      kind: 'deposit',
      date: '2026-11-01',
      cents: 30000,
    });
    expect(
      nextPaymentDue({ ...invoice, amount_paid: 300, amount_due: 700 }),
    ).toEqual({ kind: 'balance', date: '2026-12-01', cents: 70000 });
    expect(
      nextPaymentDue({
        ...invoice,
        balance_due_date: null,
        amount_paid: 300,
        amount_due: 700,
      }).date,
    ).toBe('2026-11-01');
  });

  it('only accepts "deposit" as an explicit choice', () => {
    expect(normalizePayAmount('deposit')).toBe('deposit');
    expect(normalizePayAmount('anything')).toBe('full');
    expect(normalizePayAmount(undefined)).toBe('full');
  });

  it('validates deposit and balance dates', () => {
    expect(validateDeposit({ deposit_amount: null })).toBeNull();
    expect(validateDeposit({ deposit_amount: 0 })).toMatch('greater than zero');
    expect(
      validateDeposit({ deposit_amount: 1000, total_amount: 1000 }),
    ).toMatch('less than');
    expect(
      validateDeposit({
        deposit_amount: 100,
        total_amount: 1000,
        due_date: '2026-11-10',
        balance_due_date: '2026-11-01',
      }),
    ).toMatch('cannot be before');
    expect(
      validateDeposit({
        deposit_amount: 100,
        total_amount: 1000,
        due_date: '2026-11-01',
        balance_due_date: '2026-12-01',
      }),
    ).toBeNull();
  });
});
