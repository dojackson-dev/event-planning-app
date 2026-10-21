import { nextPaymentDue } from '../payments/invoice-deposit';
import {
  DUE_SOON_DAYS,
  MAX_ACTIVITY,
  RECENT_DAYS,
  SEVERITY_ORDER,
  URGENT_EVENT_DAYS,
  addDays,
  day,
  daysBetween,
  fingerprintOf,
  money,
  plural,
  weekdayDate,
  type AssistantActivity,
  type AssistantEvent,
  type AssistantPriority,
  type AssistantSummary,
  type PriorityReason,
  type TaskSeverity,
} from './assistant-summary';

export type ProviderRole = 'promoter' | 'vendor' | 'artist';

export interface ProviderWork {
  id: string;
  name: string;
  date: string;
  startTime: string | null;
  href: string;
  notes: string[];
  /** What is still open on this job; none means it is simply on the calendar. */
  reasons: PriorityReason[];
}

/** A role-specific line, such as booking requests waiting for a reply. */
export interface ProviderLine {
  key: string;
  severity: TaskSeverity;
  title: string;
  reasons: PriorityReason[];
  href: string;
  actionLabel: string;
  rank: number;
}

export interface ProviderInput {
  today: string;
  /** Invoices this account sent that are not paid or cancelled. */
  invoices: any[];
  invoicesHref: string;
  upcoming: ProviderWork[];
  lines: ProviderLine[];
  recentPaid: any[];
}

const OVERDUE_RANK = URGENT_EVENT_DAYS + 1;
const DUE_SOON_RANK = URGENT_EVENT_DAYS + 2;
const DRAFT_RANK = 200;

/** Same output shape as the owner summary, so one dashboard panel serves every role. */
export function buildProviderSummary(input: ProviderInput): AssistantSummary {
  const { today } = input;
  const ranked: {
    p: Omit<AssistantPriority, 'fingerprint' | 'targets'>;
    rank: number;
  }[] = [];

  const open = input.invoices
    .filter(
      (i) =>
        i.status !== 'draft' && i.status !== 'paid' && i.status !== 'cancelled',
    )
    .map((i) => ({ inv: i, next: nextPaymentDue(i) }))
    .filter((x) => x.next.cents > 0);
  const overdue = open.filter((x) => x.next.date && day(x.next.date)! < today);
  const dueSoon = open.filter((x) => {
    const d = x.next.date ? day(x.next.date) : null;
    return !!d && d >= today && d <= addDays(today, DUE_SOON_DAYS);
  });
  const cents = (rows: typeof open) =>
    rows.reduce((s, x) => s + x.next.cents, 0) / 100;

  if (overdue.length > 0) {
    const oldest = Math.max(
      ...overdue.map((x) => daysBetween(day(x.next.date)!, today)),
    );
    ranked.push({
      rank: OVERDUE_RANK,
      p: {
        key: 'invoices-overdue',
        severity: 'urgent',
        title: `${plural(overdue.length, 'overdue invoice')} totaling ${money(cents(overdue))}`,
        reasons: [
          {
            actor: 'client',
            text: `The oldest is ${plural(oldest, 'day')} past due.`,
          },
        ],
        href: input.invoicesHref,
        actionLabel: 'View overdue invoices',
      },
    });
  }
  if (dueSoon.length > 0) {
    ranked.push({
      rank: DUE_SOON_RANK,
      p: {
        key: 'invoices-due-soon',
        severity: 'attention',
        title: `${plural(dueSoon.length, 'invoice')} due in the next ${DUE_SOON_DAYS} days totaling ${money(cents(dueSoon))}`,
        reasons: [
          {
            actor: 'client',
            text: 'Payment is expected soon; a reminder can help.',
          },
        ],
        href: input.invoicesHref,
        actionLabel: 'View invoices',
      },
    });
  }
  const drafts = input.invoices.filter((i) => i.status === 'draft');
  if (drafts.length > 0) {
    ranked.push({
      rank: DRAFT_RANK,
      p: {
        key: 'invoices-unsent',
        severity: 'info',
        title: `${plural(drafts.length, 'draft invoice')} not yet sent`,
        reasons: [{ actor: 'you', text: 'Nothing is owed until it is sent.' }],
        href: input.invoicesHref,
        actionLabel: 'Review drafts',
      },
    });
  }

  for (const w of input.upcoming) {
    if (w.reasons.length === 0) continue;
    const days = daysBetween(today, w.date);
    ranked.push({
      rank: days,
      p: {
        key: `event-${w.id}`,
        severity: days <= URGENT_EVENT_DAYS ? 'urgent' : 'attention',
        title: `${w.name} \u2014 ${weekdayDate(w.date)}`,
        reasons: w.reasons,
        href: w.href,
        actionLabel: 'Review',
      },
    });
  }

  for (const l of input.lines) {
    const { rank, ...p } = l;
    ranked.push({ rank, p });
  }

  ranked.sort(
    (a, b) =>
      SEVERITY_ORDER[a.p.severity] - SEVERITY_ORDER[b.p.severity] ||
      a.rank - b.rank,
  );
  const priorities: AssistantPriority[] = ranked.map((r) => ({
    ...r.p,
    targets: [],
    fingerprint: fingerprintOf(r.p),
  }));

  const upcomingEvents: AssistantEvent[] = [...input.upcoming]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map((w) => ({
      id: w.id,
      name: w.name,
      date: w.date,
      startTime: w.startTime,
      href: w.href,
      notes: w.notes,
    }));

  const since = addDays(today, -RECENT_DAYS);
  const recentActivity: AssistantActivity[] = input.recentPaid
    .filter((i) => {
      const d = day(i.paid_at);
      return !!d && d >= since;
    })
    .map((i) => ({
      text: `Payment received: ${money(Number(i.total_amount ?? 0))} from ${i.client_name ?? 'a client'}${i.invoice_number ? ` (invoice ${i.invoice_number})` : ''}.`,
      at: String(i.paid_at),
      href: input.invoicesHref,
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_ACTIVITY);

  const parts: string[] = [];
  if (priorities.length > 0)
    parts.push(
      `${priorities.length} item${priorities.length === 1 ? '' : 's'} need${priorities.length === 1 ? 's' : ''} your attention`,
    );
  if (upcomingEvents.length > 0)
    parts.push(`${plural(upcomingEvents.length, 'job')} in the next 14 days`);
  const headline =
    parts.length === 0
      ? "You're all caught up. Nothing needs your attention right now."
      : `${parts.join(' and ')}.`;

  return {
    generatedAt: new Date().toISOString(),
    headline: headline.charAt(0).toUpperCase() + headline.slice(1),
    allClear: priorities.length === 0 && upcomingEvents.length === 0,
    upcomingEvents,
    priorities,
    recentActivity,
    tasks: [],
  };
}
