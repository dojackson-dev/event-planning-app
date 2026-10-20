import { isBilledTo } from './invoice-recipient';

describe('isBilledTo', () => {
  it('matches case-insensitively and ignores whitespace', () => {
    expect(
      isBilledTo(' Marcus@DemoPromoter.com ', ['marcus@demopromoter.com']),
    ).toBe(true);
  });

  it('matches any of the promoter emails', () => {
    expect(isBilledTo('b@x.com', ['a@x.com', null, 'b@x.com'])).toBe(true);
  });

  it('rejects invoices billed to someone else', () => {
    expect(
      isBilledTo('e2e-client@demo.invalid', ['marcus@demopromoter.com']),
    ).toBe(false);
  });

  it('rejects empty client emails', () => {
    expect(isBilledTo(null, [''])).toBe(false);
    expect(isBilledTo('', [null])).toBe(false);
  });
});
