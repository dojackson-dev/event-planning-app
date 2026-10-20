import { Logger, ForbiddenException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  UPCOMING_DAYS,
  RECENT_DAYS,
  addDays,
  day,
  money,
  type SummaryInput,
} from './assistant-summary';
import type {
  ProviderInput,
  ProviderLine,
  ProviderRole,
  ProviderWork,
} from './assistant-provider';

interface RoleConfig {
  accountTable: string;
  invoiceTable: string;
  invoiceFk: string;
  invoicesHref: string;
  invoiceHref: (id: string) => string;
}

// Routes verified against packages/frontend/src/app; vendors have no invoice detail page, so they link to the list.
const ROLES: Record<ProviderRole, RoleConfig> = {
  promoter: {
    accountTable: 'promoter_accounts',
    invoiceTable: 'promoter_invoices',
    invoiceFk: 'promoter_account_id',
    invoicesHref: '/dashboard/promoter/invoices',
    invoiceHref: (id) => `/dashboard/promoter/invoices/${id}`,
  },
  vendor: {
    accountTable: 'vendor_accounts',
    invoiceTable: 'vendor_invoices',
    invoiceFk: 'vendor_account_id',
    invoicesHref: '/vendors/dashboard/invoices',
    invoiceHref: () => '/vendors/dashboard/invoices',
  },
  artist: {
    accountTable: 'artist_accounts',
    invoiceTable: 'artist_invoices',
    invoiceFk: 'artist_account_id',
    invoicesHref: '/artist/dashboard/invoices',
    invoiceHref: (id) => `/artist/dashboard/invoices/${id}`,
  },
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Loads only rows tied to the signed-in user's own account for that role; throws if they have none. */
export async function loadProviderInput(
  admin: SupabaseClient,
  role: ProviderRole,
  userId: string,
  today: string,
  logger: Logger,
): Promise<{ input: ProviderInput; askInput: SummaryInput }> {
  const cfg = ROLES[role];
  const { data: account } = await admin
    .from(cfg.accountTable)
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!account) throw new ForbiddenException(`No ${role} account found`);
  const accountId: string = account.id;

  const horizon = addDays(today, UPCOMING_DAYS);
  const since = new Date(Date.now() - RECENT_DAYS * 86400000).toISOString();

  const invoices = admin
    .from(cfg.invoiceTable)
    .select('*')
    .eq(cfg.invoiceFk, accountId)
    .neq('status', 'paid')
    .neq('status', 'cancelled')
    .limit(500);
  const paid = admin
    .from(cfg.invoiceTable)
    .select('id, invoice_number, client_name, total_amount, paid_at')
    .eq(cfg.invoiceFk, accountId)
    .eq('status', 'paid')
    .gte('paid_at', since)
    .order('paid_at', { ascending: false })
    .limit(20);

  const upcoming: ProviderWork[] = [];
  const lines: ProviderLine[] = [];
  const failures: Record<string, string> = {};

  if (role === 'promoter') {
    const { data, error } = await admin
      .from('public_events')
      .select('id, title, event_date, status')
      .eq('promoter_account_id', accountId)
      .gte('event_date', today)
      .lte('event_date', horizon)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true })
      .limit(50);
    if (error) failures.events = error.message;
    for (const e of data ?? []) {
      const date = day(e.event_date);
      if (!date) continue;
      const draft = e.status === 'draft';
      upcoming.push({
        id: e.id,
        name: e.title || 'Event',
        date,
        startTime: null,
        href: `/dashboard/promoter/events/${e.id}`,
        notes: draft ? ['Not published'] : [],
        reasons: draft
          ? [
              {
                actor: 'you',
                text: "This event isn't published yet, so tickets can't be sold.",
              },
            ]
          : [],
      });
    }
  }

  if (role === 'vendor') {
    const { data, error } = await admin
      .from('vendor_bookings')
      .select(
        'id, event_name, event_date, status, agreed_amount, total_paid, payment_status',
      )
      .eq('vendor_account_id', accountId)
      .in('status', ['pending', 'confirmed', 'paid'])
      .limit(200);
    if (error) failures.bookings = error.message;
    const pending = (data ?? []).filter((b) => b.status === 'pending');
    for (const b of data ?? []) {
      const date = day(b.event_date);
      if (b.status === 'pending' || !date || date < today || date > horizon)
        continue;
      const owed = Number(b.agreed_amount ?? 0) - Number(b.total_paid ?? 0);
      const unpaid = b.status === 'confirmed' && owed > 0;
      upcoming.push({
        id: b.id,
        name: b.event_name || 'Booking',
        date,
        startTime: null,
        href: '/vendors/dashboard/bookings',
        notes: unpaid ? ['Payment outstanding'] : [],
        reasons: unpaid
          ? [
              {
                actor: 'client',
                text: `${money(owed)} of the agreed amount has not been paid yet.`,
              },
            ]
          : [],
      });
    }
    if (pending.length > 0)
      lines.push({
        key: 'booking-requests',
        severity: 'attention',
        title: `${plural(pending.length, 'booking request')} waiting for your reply`,
        reasons: [
          { actor: 'you', text: 'Clients usually book whoever answers first.' },
        ],
        href: '/vendors/dashboard/bookings',
        actionLabel: 'Review requests',
        rank: 100,
      });
  }

  if (role === 'artist') {
    const { data, error } = await admin
      .from('artist_bookings')
      .select('id, event_name, event_date, event_start_time, status')
      .eq('artist_account_id', accountId)
      .in('status', ['inquiry', 'estimate_sent', 'deposit_paid', 'confirmed'])
      .limit(200);
    if (error) failures.bookings = error.message;
    const inquiries = (data ?? []).filter((b) => b.status === 'inquiry');
    const awaiting = (data ?? []).filter((b) => b.status === 'estimate_sent');
    for (const b of data ?? []) {
      const date = day(b.event_date);
      if (!date || date < today || date > horizon) continue;
      if (b.status !== 'confirmed' && b.status !== 'deposit_paid') continue;
      upcoming.push({
        id: b.id,
        name: b.event_name || 'Booking',
        date,
        startTime:
          typeof b.event_start_time === 'string'
            ? b.event_start_time.slice(0, 5)
            : null,
        href: `/artist/dashboard/bookings/${b.id}`,
        notes: [],
        reasons: [],
      });
    }
    if (inquiries.length > 0)
      lines.push({
        key: 'inquiries',
        severity: 'attention',
        title: `${inquiries.length === 1 ? '1 new inquiry' : `${inquiries.length} new inquiries`} waiting for an estimate`,
        reasons: [
          {
            actor: 'you',
            text: 'Send an estimate to move the booking forward.',
          },
        ],
        href: '/artist/dashboard/bookings',
        actionLabel: 'View inquiries',
        rank: 100,
      });
    if (awaiting.length > 0)
      lines.push({
        key: 'estimates-awaiting',
        severity: 'attention',
        title: `${plural(awaiting.length, 'estimate')} waiting on a client response`,
        reasons: [{ actor: 'client', text: 'A friendly follow-up may help.' }],
        href: '/artist/dashboard/bookings',
        actionLabel: 'View bookings',
        rank: 101,
      });
  }

  const [inv, recent] = await Promise.all([invoices, paid]);
  if (inv.error) failures.invoices = inv.error.message;
  if (recent.error) failures.paidInvoices = recent.error.message;
  for (const [name, message] of Object.entries(failures))
    logger.warn(`Assistant ${role} ${name} query failed: ${message}`);

  const input: ProviderInput = {
    today,
    invoices: inv.data ?? [],
    invoicesHref: cfg.invoicesHref,
    upcoming,
    lines,
    recentPaid: recent.data ?? [],
  };
  // Lets the shared question answers (balances owed, this week, what changed) work for every role.
  const askInput: SummaryInput = {
    today,
    events: upcoming.map((w) => ({
      id: w.id,
      name: w.name,
      date: w.date,
      status: 'scheduled',
    })),
    invoices: input.invoices,
    estimates: [],
    contracts: [],
    leads: [],
    invoiceHref: cfg.invoiceHref,
  };
  return { input, askInput };
}
