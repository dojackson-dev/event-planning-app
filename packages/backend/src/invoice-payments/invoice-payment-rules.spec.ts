import {
  parseAmountCents,
  parseKind,
  parseMethod,
  planPayment,
  planVoid,
  PaymentRuleError,
} from './invoice-payment-rules';

const invoice = (over: Record<string, unknown> = {}) => ({
  status: 'sent',
  total_amount: 800,
  amount_paid: 0,
  ...over,
});

describe('parseAmountCents', () => {
  it('reads dollars with up to two decimals, as numbers or text', () => {
    expect(parseAmountCents('250')).toBe(25000);
    expect(parseAmountCents('250.5')).toBe(25050);
    expect(parseAmountCents(19.99)).toBe(1999);
    expect(parseAmountCents(' 0.01 ')).toBe(1);
  });

  it('rejects zero, negatives, extra decimals, text and nothing', () => {
    for (const bad of [
      0,
      '0',
      '0.00',
      -5,
      '-5',
      '12.345',
      '$20',
      'abc',
      '',
      null,
      undefined,
      NaN,
    ]) {
      expect(parseAmountCents(bad)).toBeNull();
    }
  });
});

describe('parseKind and parseMethod', () => {
  it('only accept the known values', () => {
    expect(parseKind('owner')).toBe('owner');
    expect(parseKind('vendor')).toBe('vendor');
    expect(parseKind('constructor')).toBeNull();
    expect(parseKind('bookings')).toBeNull();
    expect(parseMethod('zelle')).toBe('zelle');
    expect(parseMethod('bitcoin')).toBeNull();
  });
});

describe('planPayment', () => {
  it('marks an invoice paid when the payment covers what is due', () => {
    expect(planPayment('owner', invoice(), 80000)).toEqual({
      amount_paid: 800,
      amount_due: 0,
      fullyPaid: true,
      status: 'paid',
    });
  });

  it('leaves a partly paid owner invoice as partial and others as sent', () => {
    expect(planPayment('owner', invoice(), 20000)).toMatchObject({
      amount_paid: 200,
      amount_due: 600,
      fullyPaid: false,
      status: 'partial',
    });
    for (const kind of ['vendor', 'artist', 'promoter'] as const) {
      expect(planPayment(kind, invoice(), 20000).status).toBe('sent');
    }
  });

  it('adds to what was already paid, and avoids floating point drift', () => {
    const plan = planPayment(
      'owner',
      invoice({ total_amount: 100.1, amount_paid: 0.1 }),
      10000,
    );
    expect(plan).toMatchObject({
      amount_paid: 100.1,
      amount_due: 0,
      fullyPaid: true,
    });
  });

  it('refuses an overpayment, a paid invoice, a cancelled invoice and a bank payment in flight', () => {
    expect(() =>
      planPayment('owner', invoice({ amount_paid: 500 }), 30100),
    ).toThrow('more than the $300.00 still due');
    expect(() =>
      planPayment('owner', invoice({ status: 'paid', amount_paid: 800 }), 100),
    ).toThrow('already paid in full');
    expect(() =>
      planPayment('owner', invoice({ status: 'cancelled' }), 100),
    ).toThrow(PaymentRuleError);
    expect(() =>
      planPayment('vendor', invoice({ status: 'processing' }), 100),
    ).toThrow('already processing');
  });
});

describe('planVoid', () => {
  it('reopens a paid invoice, partial when some other payment remains', () => {
    expect(
      planVoid('owner', invoice({ status: 'paid', amount_paid: 800 }), 30000),
    ).toEqual({
      amount_paid: 500,
      amount_due: 300,
      fullyPaid: false,
      status: 'partial',
    });
  });

  it('returns to sent when nothing remains paid, and never goes below zero', () => {
    expect(
      planVoid('vendor', invoice({ status: 'paid', amount_paid: 800 }), 80000),
    ).toMatchObject({
      amount_paid: 0,
      amount_due: 800,
      status: 'sent',
    });
    expect(
      planVoid('vendor', invoice({ amount_paid: 100 }), 99999).amount_paid,
    ).toBe(0);
  });
});
