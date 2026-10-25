import { createHash } from 'crypto';

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

export interface PriorityReason {
  text: string;
  /** Who has to move next: the owner, the client, or a vendor. */
  actor: 'you' | 'client' | 'vendor';
}

/** One line on the dashboard: an event with everything outstanding on it, or a standalone group of records. */
/** A record the owner can draft a follow-up message for. */
export interface DraftTarget {
  type: 'invoice' | 'estimate' | 'contract';
  id: string;
  label: string;
}

export interface AssistantPriority {
  key: string;
  severity: TaskSeverity;
  title: string;
  reasons: PriorityReason[];
  href: string;
  actionLabel: string;
  /** Changes when the contents of the line change, so "handled" only hides what the owner actually saw. */
  fingerprint: string;
  /** Up to three client-facing records the owner can send a follow-up about. */
  targets: DraftTarget[];
}

/** Changes whenever a line's title or reasons change, so "handled" only hides what the owner actually saw. */
export function fingerprintOf(p: {
  key: string;
  title: string;
  reasons: { text: string }[];
}): string {
  return createHash('sha256')
    .update([p.key, p.title, ...p.reasons.map((x) => x.text)].join('|'))
    .digest('hex')
    .slice(0, 16);
}

export interface AssistantActivity {
  text: string;
  at: string;
  href: string;
}

export interface AssistantSummary {
  generatedAt: string;
  headline: string;
  allClear: boolean;
  upcomingEvents: AssistantEvent[];
  /** Most urgent first; events are grouped so one event is one line. */
  priorities: AssistantPriority[];
  recentActivity: AssistantActivity[];
  tasks: AssistantTask[];
}

/** An amount the owner owes a vendor: an unpaid vendor invoice, or a booking not invoiced yet. */
export interface VendorBill {
  id: string;
  vendor: string;
  amount: number;
  /** Null until the booking has been invoiced. */
  due: string | null;
  href: string;
}

/** A confirmed vendor booking the vendor has not sent an invoice for. */
export interface AwaitingVendorInvoice {
  id: string;
  vendor: string;
  eventName: string;
  /** Null when the booking has no date. */
  eventDate: string | null;
  /** Agreed price, when one was set. */
  amount: number | null;
  href: string;
}

export interface SummaryInput {
  today: string;
  events: any[];
  invoices: any[];
  estimates: any[];
  contracts: any[];
  leads: any[];
  recent?: { paidInvoices?: any[]; signedContracts?: any[] };
  /** Every contract that exists for the owner's events, including signed ones. */
  contractLinks?: {
    event_id?: string | null;
    intake_form_id?: string | null;
  }[];
  /** Where invoice links point; owners use the default dashboard route. */
  invoiceHref?: (id: string) => string;
  /** Vendor invoices and bookings the owner still has to pay. */
  vendorBills?: VendorBill[];
  /** Confirmed vendors who have not sent an invoice yet. */
  vendorsAwaitingInvoice?: AwaitingVendorInvoice[];
}

export const UPCOMING_DAYS = 14;
export const RECENT_DAYS = 7;
export const DUE_SOON_DAYS = 7;
const ITEMS_PER_TASK = 3;
export const URGENT_EVENT_DAYS = 3;
const STALE_ESTIMATE_DAYS = 5;
export const MAX_ACTIVITY = 5;
const MAX_TARGETS = 3;
const VENDOR_PAYMENTS_HREF = '/dashboard/vendors/payments';

export const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const day = (value: unknown): string | null =>
  typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : null;

export const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const longDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const SEVERITY_ORDER: Record<TaskSeverity, number> = {
  urgent: 0,
  attention: 1,
  info: 2,
};

export const daysBetween = (from: string, to: string): number =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86400000,
  );

export const when = (days: number): string =>
  days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;

export const weekdayDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const plural = (n: number, word: string, many = `${word}s`) =>
  `${n} ${n === 1 ? word : many}`;

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

  // ── Vendor bills the owner has to pay ───────────────────────────────────
  const bills = input.vendorBills ?? [];
  const soonLimit = addDays(today, DUE_SOON_DAYS);
  const billsOverdue = bills.filter((b) => b.due && b.due < today);
  const billsSoon = bills.filter(
    (b) => b.due && b.due >= today && b.due <= soonLimit,
  );
  const billsOpen = bills.filter((b) => !b.due || b.due > soonLimit);
  const billsTotal = (rows: typeof bills) =>
    rows.reduce((n, b) => n + b.amount, 0);
  const billItem = (b: any): AssistantItem => ({
    label: `${b.vendor} \u2014 ${money(b.amount)}`,
    detail: b.due ? `due ${longDate(b.due)}` : 'not invoiced yet',
    href: b.href,
  });
  addTask({
    key: 'vendor-bills-overdue',
    label: 'Vendor invoices past due',
    severity: 'urgent',
    amount: billsTotal(billsOverdue),
    href: VENDOR_PAYMENTS_HREF,
    rows: billsOverdue,
    item: billItem,
  });
  addTask({
    key: 'vendor-bills-due-soon',
    label: 'Vendor invoices due in the next 7 days',
    severity: 'attention',
    amount: billsTotal(billsSoon),
    href: VENDOR_PAYMENTS_HREF,
    rows: billsSoon,
    item: billItem,
  });
  addTask({
    key: 'vendor-bills-open',
    label: 'Other vendor invoices to pay',
    severity: 'info',
    amount: billsTotal(billsOpen),
    href: VENDOR_PAYMENTS_HREF,
    rows: billsOpen,
    item: billItem,
  });

  // ── Confirmed vendors who haven't invoiced ──────────────────────────────
  const awaiting = [...(input.vendorsAwaitingInvoice ?? [])].sort((a, b) =>
    (a.eventDate ?? '9999').localeCompare(b.eventDate ?? '9999'),
  );
  // Past or imminent events matter most: the vendor should have invoiced by now.
  const awaitingSeverity: TaskSeverity = awaiting.some(
    (a) => a.eventDate && a.eventDate <= addDays(today, DUE_SOON_DAYS),
  )
    ? 'attention'
    : 'info';
  const awaitingWhen = (a: AwaitingVendorInvoice): string => {
    if (!a.eventDate) return 'no event date';
    const d = daysBetween(today, a.eventDate);
    return d < 0 ? `event was ${plural(-d, 'day')} ago` : `event ${when(d)}`;
  };
  addTask({
    key: 'vendor-invoices-missing',
    label: "Confirmed vendors who haven't sent an invoice",
    severity: awaitingSeverity,
    href: VENDOR_PAYMENTS_HREF,
    rows: awaiting,
    item: (a: AwaitingVendorInvoice): AssistantItem => ({
      label: `${a.vendor} \u2014 ${a.eventName}`,
      detail: `${awaitingWhen(a)}${a.amount ? ` \u00b7 agreed ${money(a.amount)}` : ''}`,
      href: a.href,
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

  // ── Priorities: one line per event, then standalone groups ──────────────
  const ranked: {
    p: Omit<AssistantPriority, 'fingerprint' | 'targets'>;
    rank: number;
    targets?: DraftTarget[];
  }[] = [];
  const invoiceTarget = (i: any): DraftTarget => ({
    type: 'invoice',
    id: i.id,
    label: `Invoice ${i.invoice_number ?? ''}`.trim(),
  });
  const contractTarget = (c: any): DraftTarget => ({
    type: 'contract',
    id: c.id,
    label: c.title || `Contract ${c.contract_number ?? ''}`.trim(),
  });
  const estimateTarget = (e: any): DraftTarget => ({
    type: 'estimate',
    id: e.id,
    label: `Estimate ${e.estimate_number ?? ''}`.trim(),
  });
  const claimed = new Set<string>();
  const unsigned = input.contracts.filter(
    (c) => c.status === 'sent' || c.status === 'draft',
  );

  for (const e of input.events) {
    const date = day(e.date);
    if (!date || date < today || date > addDays(today, UPCOMING_DAYS)) continue;
    if (e.status === 'cancelled') continue;
    const days = daysBetween(today, date);
    const reasons: PriorityReason[] = [];
    const targets: DraftTarget[] = [];
    let hasOverdue = false;

    for (const c of unsigned) {
      const linked =
        (c.event_id && c.event_id === e.id) ||
        (e.intake_form_id && c.intake_form_id === e.intake_form_id);
      if (!linked) continue;
      claimed.add(`c:${c.id}`);
      if (c.status === 'sent') targets.push(contractTarget(c));
      reasons.push(
        c.status === 'sent'
          ? {
              actor: 'client',
              text: `The contract is still awaiting the client's signature and the event is ${when(days)}.`,
            }
          : {
              actor: 'you',
              text: `The contract hasn't been sent yet and the event is ${when(days)}.`,
            },
      );
    }

    const linkedInvoices = input.invoices.filter(
      (i) => i.event_id && i.event_id === e.id,
    );
    const eventOverdue = overdue.filter((i) => linkedInvoices.includes(i));
    const eventUnpaid = sent.filter(
      (i) => linkedInvoices.includes(i) && !eventOverdue.includes(i),
    );
    const eventDrafts = linkedInvoices.filter((i) => i.status === 'draft');
    for (const i of [...eventOverdue, ...eventUnpaid, ...eventDrafts])
      claimed.add(`i:${i.id}`);
    for (const i of [...eventOverdue, ...eventUnpaid])
      targets.push(invoiceTarget(i));
    if (eventOverdue.length > 0) {
      hasOverdue = true;
      reasons.push({
        actor: 'client',
        text: `${money(sum(eventOverdue))} on ${plural(eventOverdue.length, 'invoice')} is overdue.`,
      });
    }
    if (eventUnpaid.length > 0) {
      reasons.push({
        actor: 'client',
        text: `${money(sum(eventUnpaid))} is still unpaid${eventUnpaid.length === 1 && day(eventUnpaid[0].due_date) ? ` (due ${longDate(day(eventUnpaid[0].due_date)!)})` : ''}.`,
      });
    }
    if (eventDrafts.length > 0) {
      reasons.push({
        actor: 'you',
        text: `${plural(eventDrafts.length, 'invoice')} for this event ${eventDrafts.length === 1 ? "hasn't" : "haven't"} been sent.`,
      });
    }
    if (e.deposit_paid === false && Number(e.deposit_amount ?? 0) > 0) {
      reasons.push({
        actor: 'client',
        text: `The ${money(Number(e.deposit_amount))} deposit hasn't been paid.`,
      });
    }
    if (reasons.length === 0) continue;

    ranked.push({
      rank: days,
      targets,
      p: {
        key: `event-${e.id}`,
        severity:
          days <= URGENT_EVENT_DAYS || hasOverdue ? 'urgent' : 'attention',
        title: `${e.name || 'Event'} \u2014 ${weekdayDate(date)}`,
        reasons,
        href: `/dashboard/events/${e.id}/manage`,
        actionLabel: 'Review event',
      },
    });
  }

  const looseOverdue = overdue.filter((i) => !claimed.has(`i:${i.id}`));
  if (looseOverdue.length > 0) {
    const oldest = looseOverdue
      .map((i) => daysBetween(day(i.due_date)!, today))
      .reduce((a, b) => Math.max(a, b), 0);
    ranked.push({
      rank: URGENT_EVENT_DAYS + 1,
      targets: looseOverdue.map(invoiceTarget),
      p: {
        key: 'invoices-overdue',
        severity: 'urgent',
        title: `${plural(looseOverdue.length, 'overdue invoice')} totaling ${money(sum(looseOverdue))}`,
        reasons: [
          {
            actor: 'client',
            text: `The oldest is ${plural(oldest, 'day')} past due.`,
          },
        ],
        href: '/dashboard/invoices?attention=overdue',
        actionLabel: 'View overdue invoices',
      },
    });
  }

  const looseDueSoon = dueSoon.filter((i) => !claimed.has(`i:${i.id}`));
  if (looseDueSoon.length > 0) {
    ranked.push({
      rank: URGENT_EVENT_DAYS + 2,
      targets: looseDueSoon.map(invoiceTarget),
      p: {
        key: 'invoices-due-soon',
        severity: 'attention',
        title: `${plural(looseDueSoon.length, 'invoice')} due in the next ${DUE_SOON_DAYS} days totaling ${money(sum(looseDueSoon))}`,
        reasons: [
          {
            actor: 'client',
            text: 'Payment is expected soon; a reminder can help.',
          },
        ],
        href: '/dashboard/invoices?attention=due-soon',
        actionLabel: 'View invoices',
      },
    });
  }

  const looseUnsigned = unsigned.filter(
    (c) => c.status === 'sent' && !claimed.has(`c:${c.id}`),
  );
  if (looseUnsigned.length > 0) {
    ranked.push({
      rank: 100,
      targets: looseUnsigned.map(contractTarget),
      p: {
        key: 'contracts-unsigned',
        severity: 'attention',
        title: `${plural(looseUnsigned.length, 'contract')} waiting for a signature`,
        reasons: [{ actor: 'client', text: 'The client has not signed yet.' }],
        href: '/dashboard/contracts?attention=unsigned',
        actionLabel: 'Review contracts',
      },
    });
  }

  const approved = input.estimates.filter((e) => e.status === 'approved');
  if (approved.length > 0) {
    ranked.push({
      rank: 101,
      p: {
        key: 'estimates-approved',
        severity: 'attention',
        title: `${plural(approved.length, 'approved estimate')} ready to invoice`,
        reasons: [
          {
            actor: 'you',
            text: 'The client said yes; turn it into an invoice.',
          },
        ],
        href: '/dashboard/estimates?attention=approved',
        actionLabel: 'Review estimates',
      },
    });
  }

  const stale = input.estimates.filter(
    (e) =>
      e.status === 'sent' &&
      day(e.issue_date) &&
      daysBetween(day(e.issue_date)!, today) >= STALE_ESTIMATE_DAYS,
  );
  if (stale.length > 0) {
    const waiting = Math.max(
      ...stale.map((e) => daysBetween(day(e.issue_date)!, today)),
    );
    ranked.push({
      rank: 102,
      targets: stale.map(estimateTarget),
      p: {
        key: 'estimates-stale',
        severity: 'attention',
        title: `${plural(stale.length, 'estimate')} with no response`,
        reasons: [
          {
            actor: 'client',
            text: `The longest has been waiting ${plural(waiting, 'day')}; a follow-up may help.`,
          },
        ],
        href: '/dashboard/estimates?attention=awaiting',
        actionLabel: 'Review estimates',
      },
    });
  }

  if (input.leads.length > 0) {
    ranked.push({
      rank: 103,
      p: {
        key: 'leads-new',
        severity: 'attention',
        title: `${plural(input.leads.length, 'new inquiry', 'new inquiries')} to follow up`,
        reasons: [
          { actor: 'you', text: 'New leads respond best to a quick reply.' },
        ],
        href: '/dashboard/clients',
        actionLabel: 'View inquiries',
      },
    });
  }

  const looseDrafts = input.invoices.filter(
    (i) => i.status === 'draft' && !claimed.has(`i:${i.id}`),
  );
  if (looseDrafts.length > 0) {
    ranked.push({
      rank: 104,
      p: {
        key: 'invoices-unsent',
        severity: 'info',
        title: `${plural(looseDrafts.length, 'draft invoice')} not yet sent`,
        reasons: [{ actor: 'you', text: 'Nothing is owed until it is sent.' }],
        href: '/dashboard/invoices?attention=unsent',
        actionLabel: 'Review drafts',
      },
    });
  }

  const billLine = (
    rows: typeof bills,
    key: string,
    severity: TaskSeverity,
    rank: number,
    reason: string,
  ) => {
    if (rows.length === 0) return;
    ranked.push({
      rank,
      p: {
        key,
        severity,
        title: `${plural(rows.length, 'vendor invoice')} to pay totaling ${money(billsTotal(rows))}`,
        reasons: [{ actor: 'you', text: reason }],
        href: VENDOR_PAYMENTS_HREF,
        actionLabel: 'Pay vendors',
      },
    });
  };
  if (billsOverdue.length > 0) {
    const oldest = Math.max(
      ...billsOverdue.map((b) => daysBetween(b.due!, today)),
    );
    billLine(
      billsOverdue,
      'vendor-bills-overdue',
      'urgent',
      URGENT_EVENT_DAYS + 1,
      `The oldest is ${plural(oldest, 'day')} past due.`,
    );
  }
  if (billsSoon.length > 0) {
    const earliest = billsSoon.map((b) => b.due!).sort()[0];
    billLine(
      billsSoon,
      'vendor-bills-due-soon',
      'attention',
      URGENT_EVENT_DAYS + 2,
      `The earliest is due ${longDate(earliest)}.`,
    );
  }
  billLine(
    billsOpen,
    'vendor-bills-open',
    'info',
    105,
    'Vendors are waiting to be paid for these bookings.',
  );

  if (awaiting.length > 0) {
    const shown = awaiting.slice(0, MAX_TARGETS);
    const reasons: PriorityReason[] = shown.map((a) => ({
      actor: 'vendor',
      text: `${a.vendor} hasn't sent an invoice for ${a.eventName} (${awaitingWhen(a)}).`,
    }));
    if (awaiting.length > shown.length)
      reasons.push({
        actor: 'vendor',
        text: `And ${awaiting.length - shown.length} more.`,
      });
    ranked.push({
      rank: 99,
      p: {
        key: 'vendor-invoices-missing',
        severity: awaitingSeverity,
        title: `${plural(awaiting.length, 'confirmed vendor')} ${awaiting.length === 1 ? "hasn't" : "haven't"} sent an invoice`,
        reasons,
        href: VENDOR_PAYMENTS_HREF,
        actionLabel: 'Review vendors',
      },
    });
  }

  ranked.sort(
    (a, b) =>
      SEVERITY_ORDER[a.p.severity] - SEVERITY_ORDER[b.p.severity] ||
      a.rank - b.rank,
  );
  const priorities: AssistantPriority[] = ranked.map((r) => ({
    ...r.p,
    targets: (r.targets ?? []).slice(0, MAX_TARGETS),
    fingerprint: fingerprintOf(r.p),
  }));

  // ── Recent activity ─────────────────────────────────────────────────────
  const since = addDays(today, -RECENT_DAYS);
  const activity: AssistantActivity[] = [];
  for (const i of input.recent?.paidInvoices ?? []) {
    const at = day(i.paid_date);
    if (!at || at < since) continue;
    activity.push({
      text: `Payment received: ${money(Number(i.total_amount ?? 0))} from ${i.client_name ?? 'a client'}${i.invoice_number ? ` (invoice ${i.invoice_number})` : ''}.`,
      at: String(i.paid_date),
      href: `/dashboard/invoices/${i.id}`,
    });
  }
  for (const c of input.recent?.signedContracts ?? []) {
    const at = day(c.signed_date);
    if (!at || at < since) continue;
    activity.push({
      text: `${c.client_name ?? 'A client'} signed ${c.title || 'a contract'}.`,
      at: String(c.signed_date),
      href: `/dashboard/contracts/${c.id}`,
    });
  }
  for (const l of input.leads) {
    const at = day(l.created_at);
    if (!at || at < since) continue;
    activity.push({
      text: `New inquiry from ${l.contact_name || 'a new lead'}.`,
      at: String(l.created_at),
      href: `/dashboard/clients/${l.id}`,
    });
  }
  const recentActivity = activity
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_ACTIVITY);

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
    priorities,
    recentActivity,
    tasks,
  };
}
