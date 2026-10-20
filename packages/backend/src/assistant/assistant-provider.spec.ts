import { buildProviderSummary, type ProviderInput } from './assistant-provider';
import { answerIntent } from './assistant-ask';

const today = '2026-10-19';
const base: ProviderInput = {
  today,
  invoices: [],
  invoicesHref: '/dashboard/promoter/invoices',
  upcoming: [],
  lines: [],
  recentPaid: [],
};

const invoice = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  invoice_number: 'PINV-1',
  client_name: 'Casey',
  status: 'sent',
  total_amount: 1000,
  amount_paid: 0,
  amount_due: 1000,
  due_date: '2026-10-10',
  ...over,
});

describe('provider assistant summary', () => {
  it('reports all clear when there is nothing to do', () => {
    const s = buildProviderSummary(base);
    expect(s.allClear).toBe(true);
    expect(s.priorities).toEqual([]);
    expect(s.tasks).toEqual([]);
  });

  it('flags overdue, due-soon and draft invoices and ignores paid and zero-balance ones', () => {
    const s = buildProviderSummary({
      ...base,
      invoices: [
        invoice(),
        invoice({ id: 'i2', due_date: '2026-10-22', amount_due: 250 }),
        invoice({ id: 'i3', status: 'draft' }),
        invoice({ id: 'i4', status: 'paid' }),
        invoice({ id: 'i5', amount_due: 0 }),
      ],
    });
    expect(s.priorities.map((p) => p.key)).toEqual([
      'invoices-overdue',
      'invoices-due-soon',
      'invoices-unsent',
    ]);
    expect(s.priorities[0].title).toBe('1 overdue invoice totaling $1,000.00');
    expect(s.priorities[0].href).toBe('/dashboard/promoter/invoices');
    expect(s.priorities[0].fingerprint).toHaveLength(16);
  });

  it('uses the balance date once a deposit is covered', () => {
    const s = buildProviderSummary({
      ...base,
      invoices: [
        invoice({
          deposit_amount: 300,
          amount_paid: 300,
          amount_due: 700,
          due_date: '2026-10-01',
          balance_due_date: '2026-11-30',
        }),
      ],
    });
    expect(s.priorities).toEqual([]);
  });

  it('puts a job with open items first when it is days away, ahead of overdue invoices', () => {
    const s = buildProviderSummary({
      ...base,
      invoices: [invoice()],
      upcoming: [
        {
          id: 'e1',
          name: 'Friday Show',
          date: '2026-10-21',
          startTime: null,
          href: '/dashboard/promoter/events/e1',
          notes: ['Not published'],
          reasons: [{ actor: 'you', text: "This event isn't published yet." }],
        },
        {
          id: 'e2',
          name: 'Calm Show',
          date: '2026-10-25',
          startTime: null,
          href: '/dashboard/promoter/events/e2',
          notes: [],
          reasons: [],
        },
      ],
      lines: [
        {
          key: 'inquiries',
          severity: 'attention',
          title: '2 new inquiries waiting for an estimate',
          reasons: [{ actor: 'you', text: 'Send an estimate.' }],
          href: '/artist/dashboard/bookings',
          actionLabel: 'View inquiries',
          rank: 100,
        },
      ],
    });
    expect(s.priorities.map((p) => p.key)).toEqual([
      'event-e1',
      'invoices-overdue',
      'inquiries',
    ]);
    expect(s.upcomingEvents.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(s.headline).toBe(
      '3 items need your attention and 2 jobs in the next 14 days.',
    );
  });

  it('lists payments received in the last week', () => {
    const s = buildProviderSummary({
      ...base,
      recentPaid: [
        {
          id: 'p',
          invoice_number: 'PINV-9',
          client_name: 'Williams',
          total_amount: 600,
          paid_at: '2026-10-18T10:00:00Z',
        },
        {
          id: 'old',
          client_name: 'Old',
          total_amount: 5,
          paid_at: '2026-09-01T10:00:00Z',
        },
      ],
    });
    expect(s.recentActivity.map((a) => a.text)).toEqual([
      'Payment received: $600.00 from Williams (invoice PINV-9).',
    ]);
  });

  it('answers who owes money with role-specific invoice links', () => {
    const input = {
      today,
      events: [],
      invoices: [invoice({ id: 'abc' })],
      estimates: [],
      contracts: [],
      leads: [],
      invoiceHref: (id: string) => `/artist/dashboard/invoices/${id}`,
    };
    const a = answerIntent(
      'final-payments',
      buildProviderSummary({ ...base, invoices: input.invoices }),
      input,
    );
    expect(a.items[0].href).toBe('/artist/dashboard/invoices/abc');
  });
});
