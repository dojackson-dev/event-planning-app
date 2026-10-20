import { buildAssistantSummary } from './assistant-summary';
import { generateNarrative, narrativeInput } from './assistant-narrative';

const today = '2026-10-19';
const empty = {
  today,
  events: [],
  invoices: [],
  estimates: [],
  contracts: [],
  leads: [],
};

describe('assistant summary', () => {
  it('reports all clear when nothing is outstanding', () => {
    const s = buildAssistantSummary(empty);
    expect(s.allClear).toBe(true);
    expect(s.tasks).toEqual([]);
    expect(s.headline).toMatch(/all caught up/i);
  });

  it('splits invoices into overdue, due soon and unsent, ignoring paid and cancelled', () => {
    const s = buildAssistantSummary({
      ...empty,
      invoices: [
        {
          id: '1',
          invoice_number: 'INV-1',
          status: 'sent',
          amount_due: 100,
          total_amount: 100,
          due_date: '2026-10-10',
        },
        {
          id: '2',
          invoice_number: 'INV-2',
          status: 'partial',
          amount_due: 50,
          total_amount: 100,
          due_date: '2026-10-22',
        },
        {
          id: '3',
          invoice_number: 'INV-3',
          status: 'draft',
          amount_due: 80,
          total_amount: 80,
          due_date: '2026-10-01',
        },
        {
          id: '4',
          invoice_number: 'INV-4',
          status: 'sent',
          amount_due: 0,
          total_amount: 60,
          due_date: '2026-10-01',
        },
        {
          id: '5',
          invoice_number: 'INV-5',
          status: 'sent',
          amount_due: 70,
          total_amount: 70,
          due_date: '2026-12-31',
        },
      ],
    });
    const byKey = Object.fromEntries(s.tasks.map((t) => [t.key, t]));
    expect(byKey['invoices-overdue']).toMatchObject({
      count: 1,
      amount: 100,
      severity: 'urgent',
      href: '/dashboard/invoices?attention=overdue',
    });
    expect(byKey['invoices-due-soon']).toMatchObject({ count: 1, amount: 50 });
    expect(byKey['invoices-unsent']).toMatchObject({ count: 1 });
    expect(s.tasks[0].key).toBe('invoices-overdue');
    expect(byKey['invoices-overdue'].items[0].href).toBe(
      '/dashboard/invoices/1',
    );
  });

  it('covers estimates, contracts and leads with links to filtered lists', () => {
    const s = buildAssistantSummary({
      ...empty,
      estimates: [
        {
          id: 'e1',
          estimate_number: 'EST-1',
          status: 'sent',
          total_amount: 500,
          expiration_date: '2026-10-01',
        },
        {
          id: 'e2',
          estimate_number: 'EST-2',
          status: 'approved',
          total_amount: 900,
        },
        {
          id: 'e3',
          estimate_number: 'EST-3',
          status: 'draft',
          total_amount: 100,
        },
      ],
      contracts: [
        {
          id: 'c1',
          title: 'Venue Agreement',
          status: 'sent',
          client_name: 'Dana',
        },
        { id: 'c2', contract_number: 'CON-2', status: 'draft' },
      ],
      leads: [{ id: 'l1', contact_name: 'Sam', event_type: 'baby_shower' }],
    });
    const hrefs = s.tasks.map((t) => t.href).sort();
    expect(hrefs).toEqual([
      '/dashboard/clients',
      '/dashboard/contracts?attention=unsent',
      '/dashboard/contracts?attention=unsigned',
      '/dashboard/estimates?attention=approved',
      '/dashboard/estimates?attention=awaiting',
      '/dashboard/estimates?attention=unsent',
    ]);
    const awaiting = s.tasks.find((t) => t.key === 'estimates-awaiting')!;
    expect(awaiting.items[0].detail).toContain('expired');
    expect(s.headline).toMatch(/^6 items need your attention/);
  });

  it('lists only upcoming, non-cancelled events within two weeks, soonest first', () => {
    const s = buildAssistantSummary({
      ...empty,
      events: [
        { id: 'late', name: 'Later', date: '2026-11-20', status: 'scheduled' },
        {
          id: 'b',
          name: 'Second',
          date: '2026-10-25',
          status: 'scheduled',
          deposit_paid: false,
          deposit_amount: 500,
        },
        {
          id: 'a',
          name: 'First',
          date: '2026-10-20',
          start_time: '18:00:00',
          status: 'scheduled',
        },
        { id: 'x', name: 'Cancelled', date: '2026-10-21', status: 'cancelled' },
        { id: 'p', name: 'Past', date: '2026-10-01', status: 'scheduled' },
      ],
    });
    expect(s.upcomingEvents.map((e) => e.id)).toEqual(['a', 'b']);
    expect(s.upcomingEvents[0].startTime).toBe('18:00');
    expect(s.upcomingEvents[1].notes).toEqual(['Deposit not paid yet']);
    expect(s.upcomingEvents[0].href).toBe('/dashboard/events/a/manage');
  });

  it('shows at most three example items per task but the full count', () => {
    const invoices = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      invoice_number: `INV-${i}`,
      status: 'sent',
      amount_due: 10,
      total_amount: 10,
      due_date: '2026-10-01',
    }));
    const task = buildAssistantSummary({ ...empty, invoices }).tasks[0];
    expect(task.count).toBe(6);
    expect(task.items).toHaveLength(3);
  });
});

describe('assistant priorities and recent activity', () => {
  const events = [
    {
      id: 'soon',
      name: 'Johnson Wedding',
      date: '2026-10-21',
      status: 'scheduled',
      intake_form_id: 'intake-1',
    },
    {
      id: 'later',
      name: 'Corporate Reception',
      date: '2026-11-01',
      status: 'scheduled',
    },
  ];

  it('groups everything outstanding on one event into a single line with who acts', () => {
    const s = buildAssistantSummary({
      ...empty,
      events,
      contracts: [
        {
          id: 'c1',
          title: 'Wedding Agreement',
          status: 'sent',
          intake_form_id: 'intake-1',
        },
      ],
      invoices: [
        {
          id: 'i1',
          invoice_number: 'INV-1',
          status: 'sent',
          amount_due: 1200,
          total_amount: 1200,
          due_date: '2026-10-10',
          event_id: 'soon',
        },
        {
          id: 'i2',
          invoice_number: 'INV-2',
          status: 'draft',
          amount_due: 300,
          total_amount: 300,
          event_id: 'soon',
        },
      ],
    });
    const johnson = s.priorities.find((p) => p.key === 'event-soon')!;
    expect(johnson.title).toContain('Johnson Wedding');
    expect(johnson.severity).toBe('urgent');
    expect(johnson.href).toBe('/dashboard/events/soon/manage');
    expect(johnson.reasons).toEqual([
      { actor: 'client', text: expect.stringContaining('awaiting the client') },
      { actor: 'client', text: expect.stringContaining('$1,200.00') },
      { actor: 'you', text: expect.stringContaining("hasn't been sent") },
    ]);
    expect(johnson.reasons[0].text).toContain('in 2 days');
    // Linked records are not repeated as standalone lines.
    expect(s.priorities.map((p) => p.key)).toEqual(['event-soon']);
  });

  it('ranks a near event above a distant one and standalone overdue invoices between them', () => {
    const s = buildAssistantSummary({
      ...empty,
      events: [
        ...events,
        {
          id: 'far',
          name: 'Gala',
          date: '2026-10-30',
          status: 'scheduled',
          deposit_paid: false,
          deposit_amount: 500,
        },
      ],
      contracts: [{ id: 'c1', title: 'A', status: 'draft', event_id: 'soon' }],
      invoices: [
        {
          id: 'o1',
          invoice_number: 'INV-9',
          status: 'sent',
          amount_due: 100,
          total_amount: 100,
          due_date: '2026-10-01',
        },
      ],
    });
    expect(s.priorities.map((p) => p.key)).toEqual([
      'event-soon',
      'invoices-overdue',
      'event-far',
    ]);
    expect(s.priorities[1].reasons[0].text).toContain('18 days past due');
    expect(s.priorities[2].reasons[0]).toEqual({
      actor: 'client',
      text: "The $500.00 deposit hasn't been paid.",
    });
  });

  it('only flags estimates with no response after five days', () => {
    const s = buildAssistantSummary({
      ...empty,
      estimates: [
        { id: 'a', status: 'sent', issue_date: '2026-10-17' },
        { id: 'b', status: 'sent', issue_date: '2026-10-10' },
      ],
    });
    const stale = s.priorities.find((p) => p.key === 'estimates-stale')!;
    expect(stale.title).toBe('1 estimate with no response');
    expect(stale.reasons[0].text).toContain('9 days');
  });

  it('lists payments, signatures and inquiries from the last week, newest first', () => {
    const s = buildAssistantSummary({
      ...empty,
      leads: [
        { id: 'l1', contact_name: 'Sam', created_at: '2026-10-18T10:00:00Z' },
        { id: 'l2', contact_name: 'Old', created_at: '2026-09-01T10:00:00Z' },
      ],
      recent: {
        paidInvoices: [
          {
            id: 'i1',
            invoice_number: 'INV-1',
            client_name: 'Williams',
            total_amount: 600,
            paid_date: '2026-10-19T09:00:00Z',
          },
        ],
        signedContracts: [
          {
            id: 'c1',
            title: 'Venue Agreement',
            client_name: 'Williams',
            signed_date: '2026-10-15T09:00:00Z',
          },
          { id: 'c2', title: 'Old', signed_date: '2026-09-01T09:00:00Z' },
        ],
      },
    });
    expect(s.recentActivity.map((a) => a.text)).toEqual([
      'Payment received: $600.00 from Williams (invoice INV-1).',
      'New inquiry from Sam.',
      'Williams signed Venue Agreement.',
    ]);
    expect(s.recentActivity[0].href).toBe('/dashboard/invoices/i1');
  });
});

describe('assistant narrative', () => {
  const summary = buildAssistantSummary({
    ...empty,
    invoices: [
      {
        id: '1',
        invoice_number: 'INV-1',
        client_name: 'Casey Jones',
        client_email: 'casey@example.com',
        status: 'sent',
        amount_due: 100,
        total_amount: 100,
        due_date: '2026-10-10',
      },
    ],
  });

  it('sends only counts, amounts and event names — no client names or contact details', () => {
    const payload = JSON.stringify(narrativeInput(summary));
    expect(payload).not.toContain('Casey');
    expect(payload).not.toContain('casey@example.com');
    expect(payload).toContain('Overdue invoices');
  });

  it('returns null without an API key and does not call the network', async () => {
    const fetchImpl = jest.fn();
    expect(
      await generateNarrative(summary, { fetchImpl: fetchImpl as any }),
    ).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns trimmed plain text from the model', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: '  One invoice is overdue.\n\nFollow up today.  ',
              },
            },
          ],
        }),
    });
    const text = await generateNarrative(summary, {
      apiKey: 'k',
      fetchImpl: fetchImpl as any,
    });
    expect(text).toBe('One invoice is overdue. Follow up today.');
    expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer k');
  });

  it('returns null when the gateway fails', async () => {
    const failing = jest
      .fn()
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    expect(
      await generateNarrative(summary, {
        apiKey: 'k',
        fetchImpl: failing as any,
      }),
    ).toBeNull();
    const throwing = jest.fn().mockRejectedValue(new Error('network'));
    expect(
      await generateNarrative(summary, {
        apiKey: 'k',
        fetchImpl: throwing as any,
      }),
    ).toBeNull();
  });
});
