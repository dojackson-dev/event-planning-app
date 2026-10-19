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
      json: async () => ({
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
      .mockResolvedValue({ ok: false, json: async () => ({}) });
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
