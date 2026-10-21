import {
  AuctionMailService,
  deductibleCents,
  escapeHtml,
  formatEin,
} from './auction-mail.service';
import {
  classifyChargeError,
  classifyDecline,
  maskEmail,
  safeError,
} from './auction-payments.helpers';

const baseReceipt = {
  to: 'sam@example.com',
  buyerName: 'Sam Winner',
  auctionTitle: 'Gala Auction',
  eventTitle: 'Gala',
  orgName: 'Helping Hands',
  orgEin: '123456789',
  items: [
    {
      title: 'Signed guitar',
      quantity: 1,
      priceCents: 10_000,
      fmvCents: 6_000,
    },
    {
      title: 'Dinner for two',
      quantity: 1,
      priceCents: 5_000,
      fmvCents: 8_000,
    },
  ],
  subtotalCents: 15_000,
  platformFeeCents: 225,
  processingFeeCents: 520,
  taxCents: 0,
  totalCents: 15_745,
};

describe('deductibleCents', () => {
  it('is price minus fair market value, never below zero', () => {
    expect(deductibleCents(10_000, 6_000)).toBe(4_000);
    expect(deductibleCents(5_000, 8_000)).toBe(0);
    expect(deductibleCents(5_000, 0)).toBe(5_000);
  });
});

describe('AuctionMailService.buildReceipt', () => {
  const mail = new AuctionMailService();

  it('lists per-item value and deductible amount, the EIN and the disclaimer', () => {
    const { html, text, subject } = mail.buildReceipt(baseReceipt);
    expect(subject).toBe('Your receipt for Gala Auction');
    expect(html).toContain('EIN 12-3456789');
    expect(html).toContain('Signed guitar');
    expect(html).toContain('$60.00');
    expect(html).toContain('$40.00');
    // Dinner was worth more than was paid: deductible is $0.00, total deductible is $40.00.
    expect(text).toContain(
      'Dinner for two: paid $50.00, fair market value $80.00, deductible $0.00',
    );
    expect(text).toContain('Total that may be tax-deductible: $40.00');
    expect(html).toContain(
      'This is not tax advice; please consult your tax advisor.',
    );
    expect(text).toContain('This is not tax advice.');
  });

  it('marks the service fee and tax as not deductible and shows them', () => {
    const { html, text } = mail.buildReceipt({
      ...baseReceipt,
      taxCents: 1_200,
      totalCents: 16_945,
    });
    expect(html).toContain('Service fee (not deductible)');
    expect(html).toContain('$7.45');
    expect(html).toContain('Sales tax (not deductible)');
    expect(html).toContain('$12.00');
    expect(text).toContain('Service fee (not deductible): $7.45');
    expect(text).toContain('Sales tax (not deductible): $12.00');
    expect(text).toContain('Total charged: $169.45');
  });

  it('escapes every interpolated value', () => {
    const { html } = mail.buildReceipt({
      ...baseReceipt,
      buyerName: '<script>alert(1)</script>',
      orgName: 'A & B "Org"',
      items: [
        {
          title: '<img src=x onerror=alert(1)>',
          quantity: 2,
          priceCents: 100,
          fmvCents: 0,
        },
      ],
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B &quot;Org&quot;');
    expect(html).toContain('&times; 2');
  });

  it('escapeHtml covers the dangerous characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });

  it('formats a nine-digit EIN and leaves others alone', () => {
    expect(formatEin('123456789')).toBe('12-3456789');
    expect(formatEin('12-3456789')).toBe('12-3456789');
    expect(formatEin(null)).toBeNull();
  });
});

describe('AuctionMailService sending', () => {
  const send = jest.fn();
  class TestMail extends AuctionMailService {
    protected createClient() {
      return { emails: { send } } as never;
    }
  }

  beforeEach(() => send.mockReset());

  it('escapes the name and title in the outbid email', async () => {
    send.mockResolvedValue({ error: null });
    await new TestMail().sendOutbid({
      to: 'sam@example.com',
      name: '<b>Sam</b>',
      itemTitle: '"Vase" & more',
      priceCents: 1234,
      itemUrl: 'https://app.test/auctions/a/items/i',
    });
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('sam@example.com');
    expect(mail.html).not.toContain('<b>Sam</b>');
    expect(mail.html).toContain('&lt;b&gt;Sam&lt;/b&gt;');
    expect(mail.html).toContain('&quot;Vase&quot; &amp; more');
    expect(mail.html).toContain('$12.34');
  });

  it('includes the pay link and deadline in the payment-failed email', async () => {
    send.mockResolvedValue({ error: null });
    await new TestMail().sendPayLink({
      to: 'sam@example.com',
      name: 'Sam',
      auctionTitle: 'Gala',
      totalOrSubtotalCents: 10_000,
      payUrl: 'https://app.test/auctions/pay/TOKEN',
      payByAt: '2030-01-02T03:04:05Z',
      willRetry: true,
      reason: 'failed',
    });
    const mail = send.mock.calls[0][0];
    expect(mail.html).toContain('https://app.test/auctions/pay/TOKEN');
    expect(mail.text).toContain('https://app.test/auctions/pay/TOKEN');
    expect(mail.html).toContain('try your card again automatically');
  });

  it('throws when Resend reports an error so the outbox retries', async () => {
    send.mockResolvedValue({ error: { message: 'rate limited' } });
    await expect(
      new TestMail().sendWon({
        to: 'a@b.co',
        name: 'A',
        itemTitle: 'X',
        priceCents: 1,
        auctionUrl: 'https://x',
      }),
    ).rejects.toThrow('rate limited');
  });

  it('skips quietly without an API key', async () => {
    const previous = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    await expect(
      new AuctionMailService().sendWon({
        to: 'a@b.co',
        name: 'A',
        itemTitle: 'X',
        priceCents: 1,
        auctionUrl: 'https://x',
      }),
    ).resolves.toBe('skipped');
    if (previous) process.env.RESEND_API_KEY = previous;
  });
});

describe('payment helpers', () => {
  it('classifies declines', () => {
    expect(
      classifyDecline({ code: 'authentication_required' }, 1),
    ).toMatchObject({ requiresAction: true });
    expect(
      classifyDecline(
        { code: 'card_declined', decline_code: 'stolen_card' },
        1,
      ),
    ).toMatchObject({
      code: 'stolen_card',
      requiresAction: true,
    });
    expect(classifyDecline({ code: 'card_declined' }, 2)).toMatchObject({
      requiresAction: false,
      retryAfterSeconds: 86_400,
    });
    expect(classifyDecline({ code: 'card_declined' }, 3)).toMatchObject({
      requiresAction: true,
    });
  });

  it('leaves non-Stripe errors alone', () => {
    expect(classifyChargeError(new Error('boom'), 1)).toBeNull();
  });

  it('masks emails and strips PII from error strings', () => {
    expect(maskEmail('sam@example.com')).toBe('s***@example.com');
    expect(maskEmail('nonsense')).toBe('***');
    const cleaned = safeError(
      new Error('bounce for sam@example.com / +1 (555) 555-0100'),
    );
    expect(cleaned).not.toContain('sam@example.com');
    expect(cleaned).not.toContain('555-0100');
  });
});
