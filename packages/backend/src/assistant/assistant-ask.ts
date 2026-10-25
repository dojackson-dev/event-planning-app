import {
  UPCOMING_DAYS,
  type AssistantItem,
  type AssistantSummary,
  type SummaryInput,
} from './assistant-summary';

export type Intent =
  | 'before-weekend'
  | 'final-payments'
  | 'estimate-followups'
  | 'missing-contracts'
  | 'what-changed'
  | 'vendor-bills'
  | 'vendor-invoices-missing'
  | 'my-tasks';

export const SUGGESTED_QUESTIONS: { intent: Intent; question: string }[] = [
  {
    intent: 'before-weekend',
    question: 'What do I need to finish before this weekend?',
  },
  { intent: 'final-payments', question: 'Which clients owe final payments?' },
  {
    intent: 'estimate-followups',
    question: 'Which estimates need follow-up?',
  },
  {
    intent: 'missing-contracts',
    question: 'Are any upcoming events missing contracts?',
  },
  {
    intent: 'vendor-invoices-missing',
    question: "Which confirmed vendors haven't sent an invoice?",
  },
  {
    intent: 'vendor-bills',
    question: 'Which vendors do I need to pay?',
  },
  { intent: 'what-changed', question: 'What changed recently?' },
  { intent: 'my-tasks', question: 'Show outstanding items assigned to me.' },
];

export const INTENTS = SUGGESTED_QUESTIONS.map((q) => q.intent);

export interface AskAnswer {
  intent: Intent | null;
  answer: string;
  items: AssistantItem[];
}

const MAX_ITEMS = 8;

/** Keyword routing so the common questions work without AI. */
export function matchIntent(question: string): Intent | null {
  const q = question.toLowerCase();
  if (/weekend|this week|before (saturday|sunday|friday)/.test(q))
    return 'before-weekend';
  if (
    /assigned to me|my tasks?|my to-?do|what should i (do|work)|need to do/.test(
      q,
    )
  )
    return 'my-tasks';
  if (/estimate|quote/.test(q)) return 'estimate-followups';
  if (/contract|signature|signed|sign\b/.test(q)) return 'missing-contracts';
  if (/changed|since my last|what.?s new|new activity|recent/.test(q))
    return 'what-changed';
  if (
    /vendor/.test(q) &&
    /(haven.?t|hasn.?t|not|yet|missing|without|no)\b.*\b(sent|send|submit\w*|invoice\w*)|\b(sent|submit\w*)\b.*\binvoice/.test(
      q,
    ) &&
    !/\b(pay|owe|due)\b/.test(q)
  )
    return 'vendor-invoices-missing';
  if (/vendor|\bbills?\b/.test(q)) return 'vendor-bills';
  if (/final payment|owe|balance|unpaid|payment|overdue|invoice/.test(q))
    return 'final-payments';
  return null;
}

const day = (v: unknown): string | null =>
  typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86400000,
  );

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function capped(items: AssistantItem[]): AssistantItem[] {
  return items.slice(0, MAX_ITEMS);
}

function more(total: number): string {
  return total > MAX_ITEMS ? ` Showing the first ${MAX_ITEMS}.` : '';
}

/** Answers come only from the owner's records, so every item links to a real record. */
export function answerIntent(
  intent: Intent,
  summary: AssistantSummary,
  input: SummaryInput,
): AskAnswer {
  const { today } = input;

  if (intent === 'before-weekend') {
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
    const sunday = addDays(today, (7 - dow) % 7);
    const dates = new Map(
      input.events.map((e) => [`event-${e.id}`, day(e.date)]),
    );
    const rows = summary.priorities.filter((p) => {
      const d = dates.get(p.key);
      return !!d && d <= sunday;
    });
    const items = rows.map<AssistantItem>((p) => ({
      label: p.title,
      detail: p.reasons
        .map(
          (r) =>
            `${r.actor === 'you' ? 'You' : r.actor === 'vendor' ? 'Vendor' : 'Client'}: ${r.text}`,
        )
        .join(' '),
      href: p.href,
    }));
    return {
      intent,
      answer:
        items.length === 0
          ? `Nothing is outstanding on events through ${shortDate(sunday)}.`
          : `${plural(items.length, 'event')} through ${shortDate(sunday)} still ${items.length === 1 ? 'has' : 'have'} open items.`,
      items: capped(items),
    };
  }

  if (intent === 'final-payments') {
    const owed = input.invoices
      .filter(
        (i) =>
          i.status !== 'draft' &&
          i.status !== 'paid' &&
          i.status !== 'cancelled' &&
          Number(i.amount_due ?? 0) > 0,
      )
      .sort((a, b) =>
        String(day(a.due_date) ?? '9999').localeCompare(
          String(day(b.due_date) ?? '9999'),
        ),
      );
    const total = owed.reduce((s, i) => s + Number(i.amount_due), 0);
    return {
      intent,
      answer:
        owed.length === 0
          ? 'No sent invoices have a balance due.'
          : `${plural(owed.length, 'invoice')} with ${money(total)} still owed, oldest due date first.${more(owed.length)}`,
      items: capped(
        owed.map((i) => {
          const due = day(i.due_date);
          const late = due && due < today ? daysBetween(due, today) : 0;
          return {
            label: `${i.client_name ?? 'Client'} \u2014 ${money(Number(i.amount_due))}`,
            detail:
              `Invoice ${i.invoice_number ?? ''}${due ? (late ? ` \u00b7 ${plural(late, 'day')} overdue` : ` \u00b7 due ${shortDate(due)}`) : ''}`.trim(),
            href: input.invoiceHref?.(i.id) ?? `/dashboard/invoices/${i.id}`,
          };
        }),
      ),
    };
  }

  if (intent === 'estimate-followups') {
    const waiting = input.estimates
      .filter((e) => e.status === 'sent')
      .sort((a, b) =>
        String(day(a.issue_date) ?? '9999').localeCompare(
          String(day(b.issue_date) ?? '9999'),
        ),
      );
    return {
      intent,
      answer:
        waiting.length === 0
          ? 'No estimates are waiting on a client response.'
          : `${plural(waiting.length, 'estimate')} waiting on a response, longest wait first.${more(waiting.length)}`,
      items: capped(
        waiting.map((e) => {
          const issued = day(e.issue_date);
          return {
            label: `${e.client_name ?? 'Client'} \u2014 ${money(Number(e.total_amount ?? 0))}`,
            detail:
              `Estimate ${e.estimate_number ?? ''}${issued ? ` \u00b7 sent ${plural(daysBetween(issued, today), 'day')} ago` : ''}`.trim(),
            href: `/dashboard/estimates/${e.id}`,
          };
        }),
      ),
    };
  }

  if (intent === 'missing-contracts') {
    const links = input.contractLinks ?? [];
    const unsignedFor = (e: any) =>
      input.contracts.filter(
        (c) =>
          (c.event_id && c.event_id === e.id) ||
          (e.intake_form_id && c.intake_form_id === e.intake_form_id),
      );
    const items: AssistantItem[] = [];
    for (const e of input.events) {
      const d = day(e.date);
      if (!d || d < today || e.status === 'cancelled') continue;
      const hasAny = links.some(
        (c) =>
          (c.event_id && c.event_id === e.id) ||
          (e.intake_form_id && c.intake_form_id === e.intake_form_id),
      );
      const open = unsignedFor(e);
      let detail: string | null = null;
      if (!hasAny && open.length === 0)
        detail = 'No contract has been created.';
      else if (open.some((c) => c.status === 'draft'))
        detail = 'A contract exists but has not been sent.';
      else if (open.some((c) => c.status === 'sent'))
        detail = 'The contract is awaiting the client\u2019s signature.';
      if (detail)
        items.push({
          label: `${e.name || 'Event'} \u2014 ${shortDate(d)}`,
          detail,
          href: `/dashboard/events/${e.id}/manage`,
        });
    }
    return {
      intent,
      answer:
        items.length === 0
          ? `Every event in the next ${UPCOMING_DAYS} days has a signed contract.`
          : `${plural(items.length, 'event')} in the next ${UPCOMING_DAYS} days ${items.length === 1 ? 'does' : 'do'} not have a signed contract.`,
      items: capped(items),
    };
  }

  if (intent === 'vendor-bills') {
    const bills = [...(input.vendorBills ?? [])].sort((a, b) =>
      (a.due ?? '9999').localeCompare(b.due ?? '9999'),
    );
    const total = bills.reduce((n, b) => n + b.amount, 0);
    return {
      intent,
      answer:
        bills.length === 0
          ? 'You have no vendor invoices waiting to be paid.'
          : `${plural(bills.length, 'vendor invoice')} to pay, ${money(total)} in total, earliest due date first.${more(bills.length)}`,
      items: capped(
        bills.map((b) => {
          const late = b.due && b.due < today ? daysBetween(b.due, today) : 0;
          return {
            label: `${b.vendor} \u2014 ${money(b.amount)}`,
            detail: b.due
              ? late
                ? `${plural(late, 'day')} overdue`
                : `due ${shortDate(b.due)}`
              : 'Not invoiced yet',
            href: b.href,
          };
        }),
      ),
    };
  }

  if (intent === 'vendor-invoices-missing') {
    const rows = [...(input.vendorsAwaitingInvoice ?? [])].sort((a, b) =>
      (a.eventDate ?? '9999').localeCompare(b.eventDate ?? '9999'),
    );
    return {
      intent,
      answer:
        rows.length === 0
          ? 'Every confirmed vendor has sent an invoice.'
          : `${plural(rows.length, 'confirmed vendor')} ${rows.length === 1 ? "hasn't" : "haven't"} sent an invoice, earliest event first.${more(rows.length)}`,
      items: capped(
        rows.map((a) => ({
          label: `${a.vendor} \u2014 ${a.eventName}`,
          detail: a.eventDate
            ? a.eventDate < today
              ? `Event was ${plural(daysBetween(a.eventDate, today), 'day')} ago`
              : `Event ${shortDate(a.eventDate)}`
            : 'No event date',
          href: a.href,
        })),
      ),
    };
  }

  if (intent === 'what-changed') {
    const items = summary.recentActivity.map<AssistantItem>((a) => ({
      label: a.text,
      detail: shortDate(day(a.at) ?? today),
      href: a.href,
    }));
    return {
      intent,
      answer:
        items.length === 0
          ? 'Nothing new in the last 7 days: no payments, signatures or inquiries.'
          : `${plural(items.length, 'update')} in the last 7 days.`,
      items,
    };
  }

  // my-tasks: lines where the next move belongs to the owner.
  const items: AssistantItem[] = [];
  for (const p of summary.priorities)
    for (const r of p.reasons)
      if (r.actor === 'you')
        items.push({ label: p.title, detail: r.text, href: p.href });
  return {
    intent,
    answer:
      items.length === 0
        ? 'Nothing is waiting on you right now.'
        : `${plural(items.length, 'item')} waiting on you.${more(items.length)}`,
    items: capped(items),
  };
}

export function unknownQuestionAnswer(): AskAnswer {
  return {
    intent: null,
    answer:
      'I can answer questions about upcoming events, balances owed, estimates, contracts and recent activity. Try one of the suggestions below.',
    items: [],
  };
}
