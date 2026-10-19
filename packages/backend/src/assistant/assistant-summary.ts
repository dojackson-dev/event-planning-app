export type TaskSeverity = 'urgent' | 'attention' | 'info';

export interface AssistantItem {
  label: string;
  detail: string;
  href: string;
}

export interface AssistantTask {
  key: string;
  label: string;
  count: number;
  /** Money still owed, for invoice tasks. */
  amount?: number;
  severity: TaskSeverity;
  /** Filtered list page that shows exactly these records. */
  href: string;
  items: AssistantItem[];
}

export interface AssistantEvent {
  id: string;
  name: string;
  date: string;
  startTime: string | null;
  href: string;
  notes: string[];
}

export interface AssistantSummary {
  generatedAt: string;
  headline: string;
  allClear: boolean;
  upcomingEvents: AssistantEvent[];
  tasks: AssistantTask[];
}

export interface SummaryInput {
  today: string;
  events: any[];
  invoices: any[];
  estimates: any[];
  contracts: any[];
  leads: any[];
}

export const UPCOMING_DAYS = 14;
const DUE_SOON_DAYS = 7;
const ITEMS_PER_TASK = 3;

const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const day = (value: unknown): string | null =>
  typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : null;

const money = (n: number) => `$${n.toFixed(2)}`;

const longDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const SEVERITY_ORDER: Record<TaskSeverity, number> = {
  urgent: 0,
  attention: 1,
  info: 2,
};

/** Same predicates are applied by the invoice/estimate/contract list pages for ?attention=. */
export function buildAssistantSummary(input: SummaryInput): AssistantSummary {
  const { today } = input;
  const tasks: AssistantTask[] = [];

  const addTask = (
    task: Omit<AssistantTask, 'count' | 'items'> & {
      rows: any[];
      item: (row: any) => AssistantItem;
    },
  ) => {
    if (task.rows.length === 0) return;
    const { rows, item, ...rest } = task;
    tasks.push({
      ...rest,
      count: rows.length,
      items: rows.slice(0, ITEMS_PER_TASK).map(item),
    });
  };

  // ── Invoices ────────────────────────────────────────────────────────────
  const owed = (inv: any) => Number(inv.amount_due ?? 0) > 0;
  const sent = input.invoices.filter(
    (i) =>
      i.status !== 'draft' &&
      i.status !== 'paid' &&
      i.status !== 'cancelled' &&
      owed(i),
  );
  const overdue = sent.filter(
    (i) => day(i.due_date) && day(i.due_date)! < today,
  );
  const dueSoon = sent.filter((i) => {
    const due = day(i.due_date);
    return !!due && due >= today && due <= addDays(today, DUE_SOON_DAYS);
  });
  const unsentInvoices = input.invoices.filter((i) => i.status === 'draft');
  const invoiceItem = (inv: any): AssistantItem => ({
    label: `Invoice ${inv.invoice_number ?? ''}`.trim(),
    detail: `${inv.client_name ?? 'Client'} · ${money(Number(inv.amount_due ?? inv.total_amount ?? 0))}${day(inv.due_date) ? ` · due ${longDate(day(inv.due_date)!)}` : ''}`,
    href: `/dashboard/invoices/${inv.id}`,
  });
  const sum = (rows: any[]) =>
    rows.reduce((s, i) => s + Number(i.amount_due ?? 0), 0);

  addTask({
    key: 'invoices-overdue',
    label: 'Overdue invoices',
    severity: 'urgent',
    amount: sum(overdue),
    href: '/dashboard/invoices?attention=overdue',
    rows: overdue,
    item: invoiceItem,
  });
  addTask({
    key: 'invoices-due-soon',
    label: 'Invoices due in the next 7 days',
    severity: 'attention',
    amount: sum(dueSoon),
    href: '/dashboard/invoices?attention=due-soon',
    rows: dueSoon,
    item: invoiceItem,
  });
  addTask({
    key: 'invoices-unsent',
    label: 'Draft invoices not yet sent',
    severity: 'attention',
    href: '/dashboard/invoices?attention=unsent',
    rows: unsentInvoices,
    item: (inv) => ({
      ...invoiceItem(inv),
      detail: `${inv.client_name ?? 'Client'} · ${money(Number(inv.total_amount ?? 0))}`,
    }),
  });

  // ── Estimates ───────────────────────────────────────────────────────────
  const estimateItem = (e: any): AssistantItem => {
    const exp = day(e.expiration_date);
    const expiry = exp
      ? exp < today
        ? ' · expired'
        : ` · expires ${longDate(exp)}`
      : '';
    return {
      label: `Estimate ${e.estimate_number ?? ''}`.trim(),
      detail: `${e.client_name ?? 'Client'} · ${money(Number(e.total_amount ?? 0))}${expiry}`,
      href: `/dashboard/estimates/${e.id}`,
    };
  };
  addTask({
    key: 'estimates-approved',
    label: 'Approved estimates ready to turn into invoices',
    severity: 'attention',
    href: '/dashboard/estimates?attention=approved',
    rows: input.estimates.filter((e) => e.status === 'approved'),
    item: estimateItem,
  });
  addTask({
    key: 'estimates-awaiting',
    label: 'Estimates waiting on a client response',
    severity: 'attention',
    href: '/dashboard/estimates?attention=awaiting',
    rows: input.estimates.filter((e) => e.status === 'sent'),
    item: estimateItem,
  });
  addTask({
    key: 'estimates-unsent',
    label: 'Draft estimates not yet sent',
    severity: 'info',
    href: '/dashboard/estimates?attention=unsent',
    rows: input.estimates.filter((e) => e.status === 'draft'),
    item: estimateItem,
  });

  // ── Contracts ───────────────────────────────────────────────────────────
  const contractItem = (c: any): AssistantItem => ({
    label: c.title || `Contract ${c.contract_number ?? ''}`.trim(),
    detail: `${c.client_name ?? 'Client'}${day(c.sent_date) ? ` · sent ${longDate(day(c.sent_date)!)}` : ''}`,
    href: `/dashboard/contracts/${c.id}`,
  });
  addTask({
    key: 'contracts-unsigned',
    label: 'Contracts waiting for a signature',
    severity: 'attention',
    href: '/dashboard/contracts?attention=unsigned',
    rows: input.contracts.filter((c) => c.status === 'sent'),
    item: contractItem,
  });
  addTask({
    key: 'contracts-unsent',
    label: 'Draft contracts not yet sent',
    severity: 'info',
    href: '/dashboard/contracts?attention=unsent',
    rows: input.contracts.filter((c) => c.status === 'draft'),
    item: contractItem,
  });

  // ── Leads ───────────────────────────────────────────────────────────────
  addTask({
    key: 'leads-new',
    label: 'New leads to follow up with',
    severity: 'attention',
    href: '/dashboard/clients',
    rows: input.leads,
    item: (l) => ({
      label: l.contact_name || 'New lead',
      detail: `${l.event_type ? String(l.event_type).replace(/_/g, ' ') : 'Event'}${day(l.event_date) ? ` · ${longDate(day(l.event_date)!)}` : ''}`,
      href: `/dashboard/clients/${l.id}`,
    }),
  });

  tasks.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.count - a.count,
  );

  // ── Upcoming events ─────────────────────────────────────────────────────
  const upcomingEvents: AssistantEvent[] = input.events
    .filter(
      (e) =>
        day(e.date) &&
        day(e.date)! >= today &&
        day(e.date)! <= addDays(today, UPCOMING_DAYS) &&
        e.status !== 'cancelled',
    )
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      name: e.name || 'Event',
      date: day(e.date)!,
      startTime:
        typeof e.start_time === 'string' ? e.start_time.slice(0, 5) : null,
      href: `/dashboard/events/${e.id}/manage`,
      notes:
        e.deposit_paid === false && Number(e.deposit_amount ?? 0) > 0
          ? ['Deposit not paid yet']
          : [],
    }));

  // ── Headline ────────────────────────────────────────────────────────────
  const attentionCount = tasks.reduce((n, t) => n + t.count, 0);
  const parts: string[] = [];
  if (attentionCount > 0) {
    parts.push(
      `${attentionCount} item${attentionCount === 1 ? '' : 's'} need${attentionCount === 1 ? 's' : ''} your attention`,
    );
  }
  if (upcomingEvents.length > 0) {
    parts.push(
      `${upcomingEvents.length} event${upcomingEvents.length === 1 ? '' : 's'} in the next ${UPCOMING_DAYS} days`,
    );
  }
  const headline =
    parts.length === 0
      ? "You're all caught up. Nothing needs your attention right now."
      : `${parts.join(' and ')}.`;

  return {
    generatedAt: new Date().toISOString(),
    headline: headline.charAt(0).toUpperCase() + headline.slice(1),
    allClear: attentionCount === 0 && upcomingEvents.length === 0,
    upcomingEvents,
    tasks,
  };
}
