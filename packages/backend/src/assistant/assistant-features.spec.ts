import { buildAssistantSummary } from './assistant-summary';
import { applyDismissals } from './assistant-dismissals';
import {
  answerIntent,
  matchIntent,
  SUGGESTED_QUESTIONS,
} from './assistant-ask';
import { buildDraft } from './assistant-draft';
import { buildDigestEmail } from './assistant-digest';
import { classifyIntent } from './assistant-narrative';

const today = '2026-10-19'; // a Monday
const empty = {
  today,
  events: [],
  invoices: [],
  estimates: [],
  contracts: [],
  leads: [],
};

const invoice = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  invoice_number: 'INV-1',
  client_name: 'Casey Jones',
  client_email: 'casey@example.com',
  status: 'sent',
  amount_due: 1200,
  total_amount: 1200,
  due_date: '2026-10-10',
  ...over,
});

describe('snooze and mark handled', () => {
  const summary = buildAssistantSummary({ ...empty, invoices: [invoice()] });
  const line = summary.priorities[0];

  it('hides a snoozed line until its date, then shows it again', () => {
    const row = {
      item_key: line.key,
      kind: 'snooze' as const,
      until: '2026-10-22',
      fingerprint: line.fingerprint,
    };
    const during = applyDismissals(summary.priorities, [row], today);
    expect(during.visible).toEqual([]);
    expect(during.hidden).toEqual([
      { key: line.key, title: line.title, kind: 'snooze', until: '2026-10-22' },
    ]);
    expect(
      applyDismissals(summary.priorities, [row], '2026-10-22').visible,
    ).toHaveLength(1);
  });

  it('keeps a handled line hidden only while its contents are unchanged', () => {
    const row = {
      item_key: line.key,
      kind: 'handled' as const,
      until: null,
      fingerprint: line.fingerprint,
    };
    expect(applyDismissals(summary.priorities, [row], today).visible).toEqual(
      [],
    );

    const worse = buildAssistantSummary({
      ...empty,
      invoices: [invoice(), invoice({ id: 'i2', invoice_number: 'INV-2' })],
    });
    expect(
      applyDismissals(worse.priorities, [row], today).visible,
    ).toHaveLength(1);
  });

  it('never changes the records behind the line', () => {
    const invoices = [invoice()];
    const before = JSON.stringify(invoices);
    const s = buildAssistantSummary({ ...empty, invoices });
    applyDismissals(s.priorities, [], today);
    expect(JSON.stringify(invoices)).toBe(before);
  });

  it('gives overdue lines a follow-up target for the invoice', () => {
    expect(line.targets).toEqual([
      { type: 'invoice', id: 'i1', label: 'Invoice INV-1' },
    ]);
  });
});

describe('ask your assistant', () => {
  it('routes every suggested question to its own intent without AI', () => {
    for (const q of SUGGESTED_QUESTIONS)
      expect(matchIntent(q.question)).toBe(q.intent);
    expect(matchIntent('what is the weather')).toBeNull();
  });

  it('lists who owes money with links, oldest due date first', () => {
    const input = {
      ...empty,
      invoices: [
        invoice({ id: 'late', due_date: '2026-10-01', amount_due: 100 }),
        invoice({
          id: 'soon',
          due_date: '2026-10-25',
          amount_due: 50,
          client_name: 'Dana',
        }),
        invoice({ id: 'draft', status: 'draft' }),
        invoice({ id: 'paid', status: 'paid' }),
      ],
    };
    const a = answerIntent(
      'final-payments',
      buildAssistantSummary(input),
      input,
    );
    expect(a.answer).toBe(
      '2 invoices with $150.00 still owed, oldest due date first.',
    );
    expect(a.items.map((i) => i.href)).toEqual([
      '/dashboard/invoices/late',
      '/dashboard/invoices/soon',
    ]);
    expect(a.items[0].detail).toContain('18 days overdue');
  });

  it('finds upcoming events with no contract, an unsent contract or an unsigned one', () => {
    const input = {
      ...empty,
      events: [
        {
          id: 'none',
          name: 'No Contract',
          date: '2026-10-21',
          status: 'scheduled',
        },
        { id: 'draft', name: 'Draft', date: '2026-10-22', status: 'scheduled' },
        { id: 'sent', name: 'Sent', date: '2026-10-23', status: 'scheduled' },
        { id: 'ok', name: 'Signed', date: '2026-10-24', status: 'scheduled' },
      ],
      contracts: [
        { id: 'c1', status: 'draft', event_id: 'draft' },
        { id: 'c2', status: 'sent', event_id: 'sent' },
      ],
      contractLinks: [
        { event_id: 'draft' },
        { event_id: 'sent' },
        { event_id: 'ok' },
      ],
    };
    const a = answerIntent(
      'missing-contracts',
      buildAssistantSummary(input),
      input,
    );
    expect(a.items.map((i) => i.href)).toEqual([
      '/dashboard/events/none/manage',
      '/dashboard/events/draft/manage',
      '/dashboard/events/sent/manage',
    ]);
    expect(a.items[0].detail).toBe('No contract has been created.');
  });

  it('limits "before the weekend" to events through Sunday and lists only owner actions in my-tasks', () => {
    const input = {
      ...empty,
      events: [
        {
          id: 'sat',
          name: 'Saturday Party',
          date: '2026-10-24',
          status: 'scheduled',
          deposit_paid: false,
          deposit_amount: 200,
        },
        {
          id: 'next',
          name: 'Next Week',
          date: '2026-10-28',
          status: 'scheduled',
          deposit_paid: false,
          deposit_amount: 200,
        },
      ],
      contracts: [{ id: 'c', status: 'draft', event_id: 'sat' }],
    };
    const s = buildAssistantSummary(input);
    const weekend = answerIntent('before-weekend', s, input);
    expect(weekend.items.map((i) => i.href)).toEqual([
      '/dashboard/events/sat/manage',
    ]);
    const mine = answerIntent('my-tasks', s, input);
    expect(mine.items).toHaveLength(1);
    expect(mine.items[0].detail).toContain("hasn't been sent");
  });

  it('only calls the model to pick an intent, and rejects anything outside the list', async () => {
    const reply = (content: string) =>
      jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content } }] }),
      });
    const ids = ['final-payments', 'my-tasks'];
    expect(
      await classifyIntent('who has not paid', ids, {
        apiKey: 'k',
        fetchImpl: reply(' My-Tasks ') as any,
      }),
    ).toBe('my-tasks');
    expect(
      await classifyIntent('x', ids, {
        apiKey: 'k',
        fetchImpl: reply('drop table') as any,
      }),
    ).toBeNull();
    const none = jest.fn();
    expect(
      await classifyIntent('x', ids, { fetchImpl: none as any }),
    ).toBeNull();
    expect(none).not.toHaveBeenCalled();
  });
});

describe('draft follow-up', () => {
  const ctx = {
    today,
    businessName: 'The Rookery',
    payUrl: 'https://app.test/pay/invoice/tok',
  };

  it('drafts a past-due invoice reminder with the pay link, addressed to the client', () => {
    const d = buildDraft('invoice', invoice(), ctx);
    expect(d.to).toBe('casey@example.com');
    expect(d.subject).toBe('Invoice INV-1 is past due');
    expect(d.body).toContain('Hi Casey,');
    expect(d.body).toContain('$1,200.00');
    expect(d.body).toContain('October 10, 2026');
    expect(d.body).toContain('https://app.test/pay/invoice/tok');
    expect(d.body).toContain('The Rookery');
  });

  it('writes a gentler reminder when the invoice is not yet due', () => {
    const d = buildDraft('invoice', invoice({ due_date: '2026-10-25' }), ctx);
    expect(d.subject).toBe('Reminder: invoice INV-1');
    expect(d.body).toContain('is due on October 25, 2026');
  });

  it('drafts estimate and contract follow-ups and leaves the address blank when unknown', () => {
    const e = buildDraft(
      'estimate',
      {
        estimate_number: 'EST-1',
        client_name: 'Dana Lee',
        total_amount: 900,
        issue_date: '2026-10-10',
      },
      ctx,
    );
    expect(e.to).toBe('');
    expect(e.body).toContain('Hi Dana,');
    expect(e.body).toContain('sent on October 10, 2026');
    const c = buildDraft(
      'contract',
      { title: 'Venue Agreement', client_name: 'Sam' },
      { ...ctx, businessName: null },
    );
    expect(c.body).toContain('Venue Agreement');
    expect(c.body).toContain('[Your name]');
  });
});

describe('daily digest email', () => {
  it('is skipped when there is nothing to report', () => {
    expect(
      buildDigestEmail(buildAssistantSummary(empty), 'https://x.test'),
    ).toBeNull();
  });

  it('links to the records and escapes record-derived text', () => {
    const s = buildAssistantSummary({
      ...empty,
      events: [
        {
          id: 'e1',
          name: '<b>Gala</b>',
          date: '2026-10-20',
          status: 'scheduled',
          deposit_paid: false,
          deposit_amount: 100,
        },
      ],
    });
    const mail = buildDigestEmail(s, 'https://x.test')!;
    expect(mail.subject).toContain('Your EventEcos briefing');
    expect(mail.body).toContain(
      'href="https://x.test/dashboard/events/e1/manage"',
    );
    expect(mail.body).not.toContain('<b>Gala</b>');
    expect(mail.body).toContain('&lt;b&gt;Gala&lt;/b&gt;');
  });
});

describe('vendor bills the owner has to pay', () => {
  const bills = [
    {
      id: 'b1',
      vendor: 'DJ Vision',
      amount: 800,
      due: '2026-10-10',
      href: '/dashboard/vendor-invoices/b1',
    },
    {
      id: 'b2',
      vendor: 'Catering Co',
      amount: 450,
      due: '2026-10-22',
      href: '/dashboard/vendor-invoices/b2',
    },
    {
      id: 'b3',
      vendor: 'Florist',
      amount: 300,
      due: null,
      href: '/dashboard/vendors/payments',
    },
    {
      id: 'b4',
      vendor: 'Rentals',
      amount: 100,
      due: '2026-12-01',
      href: '/dashboard/vendor-invoices/b4',
    },
  ];

  it('splits bills into past due, due soon and other, each as a task and a line for the owner', () => {
    const s = buildAssistantSummary({ ...empty, vendorBills: bills });
    const task = Object.fromEntries(s.tasks.map((t) => [t.key, t]));
    expect(task['vendor-bills-overdue']).toMatchObject({
      count: 1,
      amount: 800,
      severity: 'urgent',
      href: '/dashboard/vendors/payments',
    });
    expect(task['vendor-bills-due-soon']).toMatchObject({
      count: 1,
      amount: 450,
    });
    expect(task['vendor-bills-open']).toMatchObject({ count: 2, amount: 400 });
    expect(task['vendor-bills-overdue'].items[0]).toEqual({
      label: 'DJ Vision \u2014 $800.00',
      detail: 'due Oct 10',
      href: '/dashboard/vendor-invoices/b1',
    });

    const lines = Object.fromEntries(s.priorities.map((p) => [p.key, p]));
    expect(lines['vendor-bills-overdue'].title).toBe(
      '1 vendor invoice to pay totaling $800.00',
    );
    expect(lines['vendor-bills-overdue'].reasons).toEqual([
      { actor: 'you', text: 'The oldest is 9 days past due.' },
    ]);
    expect(lines['vendor-bills-overdue'].actionLabel).toBe('Pay vendors');
    expect(lines['vendor-bills-open'].severity).toBe('info');
    expect(s.headline).toMatch(/^4 items need your attention/);
  });

  it('answers "which vendors do I need to pay" with links, earliest due first and uninvoiced last', () => {
    expect(matchIntent('Which vendors do I need to pay?')).toBe('vendor-bills');
    const input = { ...empty, vendorBills: bills };
    const a = answerIntent('vendor-bills', buildAssistantSummary(input), input);
    expect(a.answer).toBe(
      '4 vendor invoices to pay, $1,650.00 in total, earliest due date first.',
    );
    expect(a.items.map((i) => i.href)).toEqual([
      '/dashboard/vendor-invoices/b1',
      '/dashboard/vendor-invoices/b2',
      '/dashboard/vendor-invoices/b4',
      '/dashboard/vendors/payments',
    ]);
    expect(a.items[3].detail).toBe('Not invoiced yet');
  });

  it("includes vendor bills in my-tasks because the next move is the owner's", () => {
    const input = { ...empty, vendorBills: bills };
    const a = answerIntent('my-tasks', buildAssistantSummary(input), input);
    expect(a.items.some((i) => i.href === '/dashboard/vendors/payments')).toBe(
      true,
    );
  });
});
