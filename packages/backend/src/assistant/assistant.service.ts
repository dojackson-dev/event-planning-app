import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import {
  AssistantSummary,
  RECENT_DAYS,
  SummaryInput,
  UPCOMING_DAYS,
  type VendorBill,
  type AwaitingVendorInvoice,
  buildAssistantSummary,
} from './assistant-summary';
import { buildProviderSummary, type ProviderRole } from './assistant-provider';
import { loadProviderInput } from './assistant-provider-loader';
import {
  generateNarrative,
  narrativeInput,
  classifyIntent,
} from './assistant-narrative';
import {
  DismissalRow,
  HiddenPriority,
  applyDismissals,
} from './assistant-dismissals';
import {
  AskAnswer,
  INTENTS,
  SUGGESTED_QUESTIONS,
  answerIntent,
  matchIntent,
  unknownQuestionAnswer,
  type Intent,
} from './assistant-ask';
import { Draft, DraftType, buildDraft } from './assistant-draft';

const NARRATIVE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const MAX_SNOOZE_DAYS = 90;
// Older confirmed bookings with no invoice are treated as settled elsewhere.
const AWAITING_LOOKBACK_DAYS = 90;
const MAX_QUESTION_LENGTH = 200;

const DRAFT_TABLES: Record<DraftType, string> = {
  invoice: 'invoices',
  estimate: 'estimates',
  contract: 'contracts',
};

export interface AssistantView extends AssistantSummary {
  hidden: HiddenPriority[];
  suggestedQuestions: string[];
  /** True when the owner can snooze or hide lines (the migration has been applied). */
  canDismiss: boolean;
}

export type AssistantRole = 'owner' | ProviderRole;

export function parseRole(value: unknown): AssistantRole {
  return value === 'promoter' || value === 'vendor' || value === 'artist'
    ? value
    : 'owner';
}

/** Providers have no contracts or estimates in the assistant, so those questions are owner-only. */
const PROVIDER_INTENTS: Intent[] = [
  'before-weekend',
  'final-payments',
  'what-changed',
  'my-tasks',
];

const questionsFor = (role: AssistantRole) =>
  SUGGESTED_QUESTIONS.filter(
    (q) => role === 'owner' || PROVIDER_INTENTS.includes(q.intent),
  ).map((q) => q.question);

const storeKey = (role: AssistantRole, key: string) =>
  role === 'owner' ? key : `${role}:${key}`;

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  !!error &&
  (error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /assistant_(dismissals|preferences)/.test(error.message ?? ''));

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly narrativeCache = new Map<
    string,
    { hash: string; text: string | null; at: number }
  >();

  constructor(private readonly supabaseService: SupabaseService) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgo(n: number): string {
    return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  }

  /**
   * Vendor invoices the owner has not paid, plus confirmed bookings whose vendor
   * has not sent an invoice yet (kept apart so they are not counted as bills).
   */
  private async loadVendorBills(userId: string): Promise<{
    bills: VendorBill[];
    awaiting: AwaitingVendorInvoice[];
  }> {
    const admin = this.supabaseService.getAdminClient();
    try {
      // Same account lookup the Vendor Payments page uses.
      const { data: membership } = await admin
        .from('memberships')
        .select('owner_account_id')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .maybeSingle();
      let accountId: string | null = membership?.owner_account_id ?? null;
      if (!accountId) {
        const { data: account } = await admin
          .from('owner_accounts')
          .select('id')
          .eq('primary_owner_id', userId)
          .maybeSingle();
        accountId = account?.id ?? null;
      }
      if (!accountId) return { bills: [], awaiting: [] };

      const [invoices, invoiced, bookings] = await Promise.all([
        admin
          .from('vendor_invoices')
          .select(
            'id, status, amount_due, total_amount, due_date, vendor_accounts(business_name)',
          )
          .eq('owner_account_id', accountId)
          .eq('invoice_type', 'owner_booking')
          .neq('status', 'draft')
          .neq('status', 'paid')
          .neq('status', 'cancelled')
          .limit(200),
        admin
          .from('vendor_invoices')
          .select('vendor_booking_id, status')
          .eq('owner_account_id', accountId)
          .eq('invoice_type', 'owner_booking')
          .not('vendor_booking_id', 'is', null)
          .limit(1000),
        admin
          .from('vendor_bookings')
          .select(
            'id, status, agreed_amount, total_paid, payment_status, event_id, event_name, event_date, vendor_accounts(business_name)',
          )
          .eq('owner_account_id', accountId)
          .limit(500),
      ]);
      for (const [name, r] of Object.entries({ invoices, invoiced, bookings }))
        if (r.error)
          this.logger.warn(
            `Assistant vendor bills ${name} query failed: ${r.error.message}`,
          );

      const vendorName = (row: any): string => {
        const v = Array.isArray(row.vendor_accounts)
          ? row.vendor_accounts[0]
          : row.vendor_accounts;
        return v?.business_name || 'Vendor';
      };

      const bills: VendorBill[] = (invoices.data ?? [])
        .map((i: any) => ({
          id: i.id as string,
          vendor: vendorName(i),
          amount: Number(i.amount_due ?? i.total_amount ?? 0),
          due: typeof i.due_date === 'string' ? i.due_date.slice(0, 10) : null,
          href: `/dashboard/vendor-invoices/${i.id}`,
        }))
        .filter((b) => b.amount > 0);

      // A draft is still private to the vendor, so only sent invoices count.
      const invoicedBookings = new Set(
        (invoiced.data ?? [])
          .filter((r: any) => r.status !== 'draft' && r.status !== 'cancelled')
          .map((r: any) => r.vendor_booking_id),
      );
      const awaitingBookings = (bookings.data ?? []).filter(
        (b: any) =>
          (b.status === 'confirmed' || b.status === 'completed') &&
          b.payment_status !== 'paid' &&
          !invoicedBookings.has(b.id) &&
          (!b.event_date ||
            String(b.event_date).slice(0, 10) >=
              this.daysAgo(AWAITING_LOOKBACK_DAYS)),
      );
      const eventIds = [
        ...new Set(
          awaitingBookings.map((b: any) => b.event_id).filter(Boolean),
        ),
      ];
      const cancelledEvents = new Set<string>();
      if (eventIds.length > 0) {
        const { data: evs } = await admin
          .from('event')
          .select('id, status')
          .in('id', eventIds as string[]);
        for (const e of evs ?? [])
          if (e.status === 'cancelled') cancelledEvents.add(e.id);
      }
      const awaiting: AwaitingVendorInvoice[] = awaitingBookings
        .filter((b: any) => !(b.event_id && cancelledEvents.has(b.event_id)))
        .map((b: any) => ({
          id: b.id as string,
          vendor: vendorName(b),
          eventName: (b.event_name as string) || 'the event',
          eventDate: b.event_date ? String(b.event_date).slice(0, 10) : null,
          amount: Number(b.agreed_amount) > 0 ? Number(b.agreed_amount) : null,
          href: '/dashboard/vendors/payments',
        }));
      const awaitingIds = new Set(awaiting.map((a) => a.id));

      for (const b of bookings.data ?? []) {
        if (
          invoicedBookings.has(b.id) ||
          awaitingIds.has(b.id) ||
          b.status === 'cancelled' ||
          b.status === 'paid' ||
          b.payment_status === 'paid'
        )
          continue;
        const amount = Number(b.agreed_amount) - Number(b.total_paid ?? 0);
        if (amount > 0)
          bills.push({
            id: b.id,
            vendor: vendorName(b),
            amount,
            due: null,
            href: '/dashboard/vendors/payments',
          });
      }
      return { bills, awaiting };
    } catch (err) {
      this.logger.warn(
        `Assistant vendor bills failed: ${(err as Error).message}`,
      );
      return { bills: [], awaiting: [] };
    }
  }

  /** Everything the assistant reports comes from the signed-in owner's own records. */
  private async loadInput(userId: string): Promise<SummaryInput> {
    const admin = this.supabaseService.getAdminClient();
    const today = this.today();
    const horizon = new Date(Date.now() + UPCOMING_DAYS * 86400000)
      .toISOString()
      .slice(0, 10);
    const since = new Date(Date.now() - RECENT_DAYS * 86400000).toISOString();
    const vendorBills = this.loadVendorBills(userId);

    const [
      events,
      invoices,
      estimates,
      contracts,
      leads,
      paidInvoices,
      signedContracts,
      contractLinks,
    ] = await Promise.all([
      admin
        .from('event')
        .select(
          'id, name, date, start_time, status, deposit_paid, deposit_amount, intake_form_id',
        )
        .eq('owner_id', userId)
        .gte('date', today)
        .lte('date', horizon)
        .order('date', { ascending: true })
        .limit(50),
      // Exclude by status rather than listing the open ones so an older status enum can't break the query.
      admin
        .from('invoices')
        .select('*')
        .eq('owner_id', userId)
        .neq('status', 'paid')
        .neq('status', 'cancelled')
        .limit(500),
      admin
        .from('estimates')
        .select(
          'id, estimate_number, client_name, status, total_amount, issue_date, expiration_date',
        )
        .eq('owner_id', userId)
        .in('status', ['draft', 'sent', 'approved'])
        .limit(500),
      admin
        .from('contracts')
        .select(
          'id, contract_number, title, client_name, status, sent_date, event_id, intake_form_id',
        )
        .eq('owner_id', userId)
        .in('status', ['draft', 'sent'])
        .limit(500),
      admin
        .from('intake_forms')
        .select('id, contact_name, event_type, event_date, created_at')
        .eq('user_id', userId)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(500),
      admin
        .from('invoices')
        .select('id, invoice_number, client_name, total_amount, paid_date')
        .eq('owner_id', userId)
        .eq('status', 'paid')
        .gte('paid_date', since)
        .order('paid_date', { ascending: false })
        .limit(20),
      admin
        .from('contracts')
        .select('id, title, client_name, signed_date')
        .eq('owner_id', userId)
        .eq('status', 'signed')
        .gte('signed_date', since)
        .order('signed_date', { ascending: false })
        .limit(20),
      admin
        .from('contracts')
        .select('event_id, intake_form_id')
        .eq('owner_id', userId)
        .neq('status', 'voided')
        .limit(1000),
    ]);

    for (const [name, result] of Object.entries({
      events,
      invoices,
      estimates,
      contracts,
      leads,
      paidInvoices,
      signedContracts,
      contractLinks,
    })) {
      if (result.error)
        this.logger.warn(
          `Assistant ${name} query failed: ${result.error.message}`,
        );
    }

    return {
      today,
      events: events.data ?? [],
      invoices: invoices.data ?? [],
      estimates: estimates.data ?? [],
      contracts: contracts.data ?? [],
      leads: leads.data ?? [],
      recent: {
        paidInvoices: paidInvoices.data ?? [],
        signedContracts: signedContracts.data ?? [],
      },
      contractLinks: contractLinks.data ?? [],
      vendorBills: (await vendorBills).bills,
      vendorsAwaitingInvoice: (await vendorBills).awaiting,
    };
  }

  /** Records and the summary built from them for one role; providers only ever see their own account. */
  private async build(
    userId: string,
    role: AssistantRole,
  ): Promise<{ summary: AssistantSummary; input: SummaryInput }> {
    if (role === 'owner') {
      const input = await this.loadInput(userId);
      return { summary: buildAssistantSummary(input), input };
    }
    const { input, askInput } = await loadProviderInput(
      this.supabaseService.getAdminClient(),
      role,
      userId,
      this.today(),
      this.logger,
    );
    return { summary: buildProviderSummary(input), input: askInput };
  }

  private async loadDismissals(
    userId: string,
    role: AssistantRole,
  ): Promise<{ rows: DismissalRow[]; available: boolean }> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('assistant_dismissals')
      .select('item_key, kind, until, fingerprint')
      .eq('user_id', userId);
    if (error) {
      if (!isMissingTable(error))
        this.logger.warn(`Assistant dismissals query failed: ${error.message}`);
      return { rows: [], available: false };
    }
    const prefix = `${role}:`;
    const rows = ((data ?? []) as DismissalRow[])
      .filter((r) =>
        role === 'owner'
          ? !r.item_key.includes(':')
          : r.item_key.startsWith(prefix),
      )
      .map((r) =>
        role === 'owner'
          ? r
          : { ...r, item_key: r.item_key.slice(prefix.length) },
      );
    return { rows, available: true };
  }

  /** The summary with the user's snoozed and handled lines removed. */
  async getSummary(
    userId: string,
    role: AssistantRole = 'owner',
  ): Promise<AssistantView> {
    const [{ summary, input }, dismissals] = await Promise.all([
      this.build(userId, role),
      this.loadDismissals(userId, role),
    ]);
    const { visible, hidden } = applyDismissals(
      summary.priorities,
      dismissals.rows,
      input.today,
    );
    return {
      ...summary,
      priorities: visible,
      hidden,
      suggestedQuestions: questionsFor(role),
      canDismiss: dismissals.available,
    };
  }

  // ── Snooze / mark handled ───────────────────────────────────────────────

  async dismiss(
    userId: string,
    role: AssistantRole,
    key: unknown,
    kind: unknown,
    until?: unknown,
  ): Promise<{ ok: true }> {
    if (typeof key !== 'string' || !key || key.length > 200)
      throw new BadRequestException('Invalid item');
    if (kind !== 'snooze' && kind !== 'handled')
      throw new BadRequestException('Choose snooze or handled');

    const today = this.today();
    let untilDate: string | null = null;
    if (kind === 'snooze') {
      const max = new Date(Date.now() + MAX_SNOOZE_DAYS * 86400000)
        .toISOString()
        .slice(0, 10);
      if (
        typeof until !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(until) ||
        until <= today ||
        until > max
      )
        throw new BadRequestException(
          `Pick a date within the next ${MAX_SNOOZE_DAYS} days`,
        );
      untilDate = until;
    }

    // The fingerprint is computed here from the owner's current records, never taken from the client.
    const { summary } = await this.build(userId, role);
    const line = summary.priorities.find((p) => p.key === key);
    if (!line)
      throw new NotFoundException('That item is no longer on your list');

    const { error } = await this.supabaseService
      .getAdminClient()
      .from('assistant_dismissals')
      .upsert(
        {
          user_id: userId,
          item_key: storeKey(role, key),
          kind,
          until: untilDate,
          fingerprint: line.fingerprint,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,item_key' },
      );
    if (error) {
      if (isMissingTable(error))
        throw new ServiceUnavailableException(
          'Snooze is not set up yet. Run migrations/add-assistant-tables.sql.',
        );
      throw new BadRequestException(error.message);
    }
    return { ok: true };
  }

  async restore(
    userId: string,
    role: AssistantRole,
    key: string,
  ): Promise<{ ok: true }> {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('assistant_dismissals')
      .delete()
      .eq('user_id', userId)
      .eq('item_key', storeKey(role, key));
    if (error && !isMissingTable(error))
      throw new BadRequestException(error.message);
    return { ok: true };
  }

  // ── Ask your assistant ──────────────────────────────────────────────────

  async ask(
    userId: string,
    role: AssistantRole,
    question: unknown,
  ): Promise<AskAnswer> {
    if (typeof question !== 'string' || !question.trim())
      throw new BadRequestException('Ask a question');
    const q = question.trim().slice(0, MAX_QUESTION_LENGTH);

    let intent: Intent | null = matchIntent(q);
    if (!intent) {
      const guess = await classifyIntent(q, INTENTS, {
        apiKey: process.env.AI_GATEWAY_API_KEY,
        model: process.env.AI_ASSISTANT_MODEL,
      });
      intent = (guess as Intent | null) ?? null;
    }
    if (!intent) return unknownQuestionAnswer();
    if (role !== 'owner' && !PROVIDER_INTENTS.includes(intent))
      return unknownQuestionAnswer();

    const { summary, input } = await this.build(userId, role);
    return answerIntent(intent, summary, input);
  }

  // ── Draft follow-up ─────────────────────────────────────────────────────

  async getDraft(userId: string, type: unknown, id: unknown): Promise<Draft> {
    if (typeof type !== 'string' || !(type in DRAFT_TABLES))
      throw new BadRequestException('Unsupported record type');
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
      throw new BadRequestException('Invalid record');

    const admin = this.supabaseService.getAdminClient();
    const { data: record } = await admin
      .from(DRAFT_TABLES[type as DraftType])
      .select('*')
      .eq('id', id)
      .eq('owner_id', userId)
      .maybeSingle();
    if (!record) throw new NotFoundException('Record not found');

    const { data: account } = await admin
      .from('owner_accounts')
      .select('business_name')
      .eq('primary_owner_id', userId)
      .maybeSingle();

    const base = process.env.FRONTEND_URL || 'https://eventecos.com';
    return buildDraft(type as DraftType, record, {
      today: this.today(),
      businessName: account?.business_name ?? null,
      payUrl:
        type === 'invoice' && record.public_token
          ? `${base}/pay/invoice/${record.public_token}`
          : undefined,
    });
  }

  // ── Email digest preference ─────────────────────────────────────────────

  async getPreferences(userId: string): Promise<{ digestEnabled: boolean }> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('assistant_preferences')
      .select('digest_enabled')
      .eq('user_id', userId)
      .maybeSingle();
    if (error && !isMissingTable(error))
      this.logger.warn(`Assistant preferences query failed: ${error.message}`);
    return { digestEnabled: !!data?.digest_enabled };
  }

  async setPreferences(
    userId: string,
    digestEnabled: unknown,
  ): Promise<{ digestEnabled: boolean }> {
    if (typeof digestEnabled !== 'boolean')
      throw new BadRequestException('digestEnabled must be true or false');
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('assistant_preferences')
      .upsert(
        {
          user_id: userId,
          digest_enabled: digestEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (error) {
      if (isMissingTable(error))
        throw new ServiceUnavailableException(
          'Email briefings are not set up yet. Run migrations/add-assistant-tables.sql.',
        );
      throw new BadRequestException(error.message);
    }
    return { digestEnabled };
  }

  // ── AI note ─────────────────────────────────────────────────────────────

  /** AI-written note for the summary; null when AI is not configured or unavailable. */
  async getNarrative(
    userId: string,
    role: AssistantRole = 'owner',
  ): Promise<string | null> {
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) return null;

    const summary = await this.getSummary(userId, role);
    const cacheKey = `${role}:${userId}`;
    const hash = createHash('sha256')
      .update(JSON.stringify(narrativeInput(summary)))
      .digest('hex');

    const cached = this.narrativeCache.get(cacheKey);
    if (
      cached &&
      cached.hash === hash &&
      Date.now() - cached.at < NARRATIVE_TTL_MS
    ) {
      return cached.text;
    }

    const text = await generateNarrative(summary, {
      apiKey,
      model: process.env.AI_ASSISTANT_MODEL,
    });
    if (this.narrativeCache.size >= MAX_CACHE_ENTRIES) {
      this.narrativeCache.delete(
        this.narrativeCache.keys().next().value as string,
      );
    }
    this.narrativeCache.set(cacheKey, { hash, text, at: Date.now() });
    return text;
  }
}
