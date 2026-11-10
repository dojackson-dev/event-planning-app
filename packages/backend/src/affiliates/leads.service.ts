import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { demoRoleLabels } from '../contact/demo-roles';
import {
  CustomValues,
  loadCustomFieldDefs,
  mergeCustomValues,
} from './lead-custom-fields';
import {
  DuplicateCandidate,
  DuplicateMatch,
  DuplicateReason,
  matchDuplicates,
} from './lead-duplicates';
import { ScoreLabel, scoreLead } from './lead-scoring';
import {
  ATTACHMENT_BUCKET,
  LEAD_SOURCES,
  LEAD_TYPES,
  LeadInput,
  UUID_RE,
  duplicateKeys,
  effectiveLeadType,
  parseLeadInput,
} from './lead-validation';

export const SALES_MANAGER_EMAIL = 'sales@eventecos.com';

export const LEAD_STATUS_UPDATES = ['claimed', 'contacted', 'won', 'lost'];
const CLAIMABLE_STATUSES = ['new', 'claimed', 'contacted'];
const LEAD_LIMIT = 1000;
const BULK_ASSIGN_LIMIT = 200;

export interface LeadAgent {
  id: string;
  email: string;
}

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  roles: string[] | null;
  description: string | null;
  status: string;
  claimed_by_affiliate_id: string | null;
  claimed_at: string | null;
  notes: string | null;
  created_at: string;
  claimed_by?: { first_name: string | null; last_name: string | null } | null;
  business_name?: string | null;
  email?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  lead_type?: string | null;
  source?: string | null;
  custom_fields?: CustomValues | null;
  next_follow_up_at?: string | null;
  last_contacted_at?: string | null;
  created_by_affiliate_id?: string | null;
}

export interface LeadView {
  id: string;
  name: string;
  phone: string;
  business_name: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  lead_type: string | null;
  lead_type_label: string | null;
  source: string;
  source_label: string;
  roles: string[];
  description: string | null;
  status: string;
  claimed: boolean;
  claimed_by_me: boolean;
  claimed_by_id: string | null;
  claimed_by_name: string | null;
  claimed_at: string | null;
  /** True when the caller may see the full contact details, notes and custom fields. */
  contact_visible: boolean;
  notes: string | null;
  custom_fields: CustomValues;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  score: number;
  score_label: ScoreLabel;
  created_at: string;
}

export interface DuplicateView {
  id: string;
  name: string;
  business_name: string | null;
  status: string;
  claimed_by_me: boolean;
  claimed_by_name: string | null;
  reasons: DuplicateReason[];
}

export interface AgentOption {
  id: string;
  name: string;
  email: string;
}

const BASE_COLUMNS =
  'id, name, phone, roles, description, status, claimed_by_affiliate_id, claimed_at, notes, created_at';
const CRM_COLUMNS =
  'business_name, email, website, city, state, lead_type, source, custom_fields, next_follow_up_at, last_contacted_at, created_by_affiliate_id';
const CLAIMER_EMBED =
  'claimed_by:affiliates!claimed_by_affiliate_id(first_name, last_name)';
const LEGACY_COLUMNS = `${BASE_COLUMNS}, ${CLAIMER_EMBED}`;
const FULL_COLUMNS = `${BASE_COLUMNS}, ${CRM_COLUMNS}, ${CLAIMER_EMBED}`;
const DUPLICATE_COLUMNS = `id, name, business_name, status, claimed_by_affiliate_id, phone_digits, email_key, business_key, ${CLAIMER_EMBED}`;
const LEGACY_RETRY_MS = 60_000;

/** Keeps only the last four digits so agents can't cherry-pick contacts before claiming. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : '***';
}

interface DbError {
  message: string;
  code?: string;
}

/** True when the CRM migration has not been run, so new columns or tables are missing. */
export function isMissingSchema(error: DbError | null | undefined): boolean {
  if (!error) return false;
  if (['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error.code ?? '')) {
    return true;
  }
  return /does not exist|schema cache|could not find/i.test(error.message);
}

function agentName(
  person:
    | { first_name: string | null; last_name: string | null }
    | null
    | undefined,
): string | null {
  if (!person) return null;
  return `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || null;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  /** After a missing-column error, use the original columns until this time. */
  private legacyUntil = 0;

  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private isManager(agent: LeadAgent): boolean {
    return agent.email === SALES_MANAGER_EMAIL;
  }

  private requireManager(agent: LeadAgent): void {
    if (!this.isManager(agent)) {
      throw new ForbiddenException('Only the sales manager can do that.');
    }
  }

  private fail(what: string, error: DbError | string): never {
    const detail = typeof error === 'string' ? { message: error } : error;
    this.logger.error(`${what}: ${detail.message}`);
    if (isMissingSchema(detail)) {
      throw new ServiceUnavailableException(
        'Lead tools are being upgraded. Please try again later.',
      );
    }
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  private requireId(id: string): void {
    if (!UUID_RE.test(id ?? '')) throw new NotFoundException('Lead not found.');
  }

  private columns(): string {
    return Date.now() < this.legacyUntil ? LEGACY_COLUMNS : FULL_COLUMNS;
  }

  /** Runs a query with the CRM columns, falling back to the original columns when the migration is missing. */
  private async withColumns<T extends { error: DbError | null }>(
    run: (columns: string) => PromiseLike<T>,
  ): Promise<T> {
    const result = await run(this.columns());
    if (
      result.error &&
      this.columns() === FULL_COLUMNS &&
      isMissingSchema(result.error)
    ) {
      this.logger.warn(
        'Lead CRM columns are missing; run migrations/add-sales-leads-crm.sql.',
      );
      this.legacyUntil = Date.now() + LEGACY_RETRY_MS;
      return run(LEGACY_COLUMNS);
    }
    return result;
  }

  private toView(row: LeadRow, agent: LeadAgent): LeadView {
    const mine = row.claimed_by_affiliate_id === agent.id;
    const showContact = this.isManager(agent) || mine;
    const leadType = effectiveLeadType(row.lead_type, row.roles);
    const source = row.source ?? 'demo_request';
    const { score, label } = scoreLead({
      lead_type: leadType,
      source,
      business_name: row.business_name ?? null,
      email: row.email ?? null,
      website: row.website ?? null,
      city: row.city ?? null,
      description: row.description,
      status: row.status,
      created_at: row.created_at,
    });
    return {
      id: row.id,
      name: row.name,
      phone: showContact ? row.phone : maskPhone(row.phone),
      business_name: row.business_name ?? null,
      email: showContact ? (row.email ?? null) : null,
      website: row.website ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      lead_type: leadType,
      lead_type_label: leadType ? LEAD_TYPES[leadType] : null,
      source,
      source_label: LEAD_SOURCES[source] ?? source,
      roles: demoRoleLabels(row.roles),
      description: row.description,
      status: row.status,
      claimed: row.claimed_by_affiliate_id !== null,
      claimed_by_me: mine,
      claimed_by_id: row.claimed_by_affiliate_id,
      claimed_by_name: agentName(row.claimed_by),
      claimed_at: row.claimed_at,
      contact_visible: showContact,
      notes: showContact ? row.notes : null,
      custom_fields: showContact ? (row.custom_fields ?? {}) : {},
      next_follow_up_at: showContact ? (row.next_follow_up_at ?? null) : null,
      last_contacted_at: showContact ? (row.last_contacted_at ?? null) : null,
      score,
      score_label: label,
      created_at: row.created_at,
    };
  }

  /** The manager sees every lead; agents see unclaimed leads (phone hidden) and their own. */
  async list(
    agent: LeadAgent,
  ): Promise<{ leads: LeadView[]; truncated: boolean }> {
    const { data, error } = await this.withColumns((columns) => {
      let query = this.db.from('demo_requests').select(columns);
      if (!this.isManager(agent)) {
        query = query.or(
          `claimed_by_affiliate_id.is.null,claimed_by_affiliate_id.eq.${agent.id}`,
        );
      }
      return query.order('created_at', { ascending: false }).limit(LEAD_LIMIT);
    });
    if (error) this.fail('Lead list failed', error);
    const rows = (data ?? []) as unknown as LeadRow[];
    return {
      truncated: rows.length >= LEAD_LIMIT,
      leads: rows
        .filter(
          (row) =>
            this.isManager(agent) ||
            row.claimed_by_affiliate_id === null ||
            row.claimed_by_affiliate_id === agent.id,
        )
        .map((row) => this.toView(row, agent)),
    };
  }

  /** First agent to claim wins: the update only matches while nobody holds the lead. */
  async claim(id: string, agent: LeadAgent): Promise<LeadView> {
    this.requireId(id);
    const now = new Date().toISOString();
    const { data, error } = await this.withColumns((columns) =>
      this.db
        .from('demo_requests')
        .update({
          status: 'claimed',
          claimed_by_affiliate_id: agent.id,
          claimed_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .is('claimed_by_affiliate_id', null)
        .in('status', CLAIMABLE_STATUSES)
        .select(columns)
        .maybeSingle(),
    );
    if (error) this.fail('Lead claim failed', error);
    if (!data) {
      const { data: existing, error: lookupError } = await this.db
        .from('demo_requests')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (lookupError) this.fail('Lead lookup failed', lookupError);
      if (!existing) throw new NotFoundException('Lead not found.');
      throw new ConflictException('This lead was already claimed.');
    }
    await this.logActivity({
      lead_id: id,
      affiliate_id: agent.id,
      type: 'assignment',
      body: 'Claimed this lead',
    });
    return this.toView(data as unknown as LeadRow, agent);
  }

  private async loadRow(id: string): Promise<LeadRow> {
    this.requireId(id);
    const { data, error } = await this.withColumns((columns) =>
      this.db.from('demo_requests').select(columns).eq('id', id).maybeSingle(),
    );
    if (error) this.fail('Lead lookup failed', error);
    if (!data) throw new NotFoundException('Lead not found.');
    return data as unknown as LeadRow;
  }

  private async loadOwned(id: string, agent: LeadAgent): Promise<LeadRow> {
    const row = await this.loadRow(id);
    if (!this.isManager(agent) && row.claimed_by_affiliate_id !== agent.id) {
      throw new ForbiddenException(
        'Only the agent who claimed this lead can change it.',
      );
    }
    return row;
  }

  /** Throws unless the caller is the claiming agent or the manager. Used by the activity and attachment endpoints. */
  async assertAccess(id: string, agent: LeadAgent): Promise<LeadRow> {
    return this.loadOwned(id, agent);
  }

  /** Puts a lead back in the pool. Won and lost leads stay closed. */
  async release(id: string, agent: LeadAgent): Promise<LeadView> {
    const row = await this.loadOwned(id, agent);
    if (!['claimed', 'contacted'].includes(row.status)) {
      throw new BadRequestException(
        'Only an open claimed lead can be released.',
      );
    }
    const { data, error } = await this.withColumns((columns) =>
      this.db
        .from('demo_requests')
        .update({
          status: 'new',
          claimed_by_affiliate_id: null,
          claimed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(columns)
        .single(),
    );
    if (error) this.fail('Lead release failed', error);
    await this.logActivity({
      lead_id: id,
      affiliate_id: agent.id,
      type: 'assignment',
      body: 'Returned this lead to the pool',
    });
    return this.toView(data as unknown as LeadRow, agent);
  }

  // ─── Duplicates ──────────────────────────────────────────────────────────

  private toDuplicateView(
    match: DuplicateMatch,
    agent: LeadAgent,
  ): DuplicateView {
    return {
      id: match.row.id,
      name: match.row.name,
      business_name: match.row.business_name,
      status: match.row.status,
      claimed_by_me: match.row.claimed_by_affiliate_id === agent.id,
      claimed_by_name: agentName(match.row.claimed_by),
      reasons: match.reasons,
    };
  }

  /** Looks up leads sharing the phone, email or business name. Contact details are never returned. */
  async findDuplicates(
    agent: LeadAgent,
    input: {
      phone?: string | null;
      email?: string | null;
      business_name?: string | null;
    },
    exceptId?: string,
  ): Promise<DuplicateView[]> {
    const keys = duplicateKeys(input);
    const lookups: Array<[string, string | null]> = [
      ['phone_digits', keys.phone],
      ['email_key', keys.email],
      ['business_key', keys.business],
    ];
    const found = new Map<string, DuplicateCandidate>();
    for (const [column, value] of lookups) {
      if (!value) continue;
      const { data, error } = await this.db
        .from('demo_requests')
        .select(DUPLICATE_COLUMNS)
        .eq(column, value)
        .limit(10);
      if (error) {
        if (isMissingSchema(error)) return [];
        this.fail('Lead duplicate check failed', error);
      }
      for (const row of (data ?? []) as unknown as DuplicateCandidate[]) {
        found.set(row.id, row);
      }
    }
    return matchDuplicates([...found.values()], keys, exceptId).map((match) =>
      this.toDuplicateView(match, agent),
    );
  }

  async checkDuplicates(
    agent: LeadAgent,
    body: {
      phone?: unknown;
      email?: unknown;
      business_name?: unknown;
      exclude_id?: unknown;
    },
  ): Promise<{ duplicates: DuplicateView[] }> {
    const text = (value: unknown) => (typeof value === 'string' ? value : null);
    const exclude =
      typeof body.exclude_id === 'string' ? body.exclude_id : undefined;
    return {
      duplicates: await this.findDuplicates(
        agent,
        {
          phone: text(body.phone),
          email: text(body.email),
          business_name: text(body.business_name),
        },
        exclude,
      ),
    };
  }

  /** Every lead's match keys, for checking an import against the whole table in one pass. */
  async duplicateIndex(): Promise<DuplicateCandidate[]> {
    const rows: DuplicateCandidate[] = [];
    const page = 1000;
    for (let from = 0; from < 20 * page; from += page) {
      const { data, error } = await this.db
        .from('demo_requests')
        .select(
          'id, name, business_name, status, claimed_by_affiliate_id, phone_digits, email_key, business_key',
        )
        .order('created_at', { ascending: true })
        .range(from, from + page - 1);
      if (error) this.fail('Lead duplicate index failed', error);
      const batch = (data ?? []) as unknown as DuplicateCandidate[];
      rows.push(...batch);
      if (batch.length < page) break;
    }
    return rows;
  }

  // ─── Create / edit ───────────────────────────────────────────────────────

  private async verifyAgent(id: string): Promise<AgentOption> {
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      throw new BadRequestException('Choose a valid sales agent.');
    }
    const { data, error } = await this.db
      .from('affiliates')
      .select('id, first_name, last_name, email, status')
      .eq('id', id)
      .maybeSingle();
    if (error) this.fail('Agent lookup failed', error);
    const row = data as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      status: string | null;
    } | null;
    if (!row || row.status === 'inactive') {
      throw new BadRequestException('That sales agent is not active.');
    }
    return {
      id: row.id,
      name: agentName(row) ?? row.email,
      email: row.email,
    };
  }

  /** Agents are always the owner of what they add; the manager can leave it in the pool or assign it. */
  async resolveOwner(
    agent: LeadAgent,
    requested: unknown,
  ): Promise<string | null> {
    if (!this.isManager(agent)) return agent.id;
    if (
      requested === undefined ||
      requested === null ||
      requested === '' ||
      requested === 'pool'
    ) {
      return null;
    }
    if (requested === 'me') return agent.id;
    return (await this.verifyAgent(requested as string)).id;
  }

  /** Active sales agents the manager can assign leads to. */
  async listAgents(agent: LeadAgent): Promise<{ agents: AgentOption[] }> {
    this.requireManager(agent);
    const { data, error } = await this.db
      .from('affiliates')
      .select('id, first_name, last_name, email, status')
      .neq('status', 'inactive')
      .order('first_name', { ascending: true });
    if (error) this.fail('Agent list failed', error);
    return {
      agents: (
        (data ?? []) as Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
        }>
      ).map((row) => ({
        id: row.id,
        name: agentName(row) ?? row.email,
        email: row.email,
      })),
    };
  }

  /** The row to insert for a new lead. Shared by manual adds and CSV imports. */
  buildInsert(
    input: LeadInput,
    options: {
      ownerId: string | null;
      createdBy: string;
      custom?: CustomValues;
      source?: string;
    },
  ): Record<string, unknown> {
    const now = new Date().toISOString();
    return {
      name: input.name,
      phone: input.phone,
      roles: [],
      description: input.description ?? null,
      notes: input.notes ?? null,
      business_name: input.business_name ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      lead_type: input.lead_type ?? null,
      source: options.source ?? input.source ?? 'manual',
      custom_fields: options.custom ?? {},
      next_follow_up_at: input.next_follow_up_at ?? null,
      created_by_affiliate_id: options.createdBy,
      status: options.ownerId ? 'claimed' : 'new',
      claimed_by_affiliate_id: options.ownerId,
      claimed_at: options.ownerId ? now : null,
    };
  }

  /** Inserts prepared rows in batches. Returns how many were saved. */
  async insertMany(rows: Array<Record<string, unknown>>): Promise<number> {
    const batch = 200;
    let saved = 0;
    for (let i = 0; i < rows.length; i += batch) {
      const chunk = rows.slice(i, i + batch);
      const { error } = await this.db.from('demo_requests').insert(chunk);
      if (error) this.fail('Lead import failed', error);
      saved += chunk.length;
    }
    return saved;
  }

  async create(
    agent: LeadAgent,
    body: Record<string, unknown>,
  ): Promise<LeadView> {
    const input = parseLeadInput(body, { partial: false });
    input.source = input.source ?? 'manual';
    const defs =
      body.custom_fields !== undefined
        ? await loadCustomFieldDefs(this.db)
        : [];
    const custom =
      body.custom_fields !== undefined
        ? mergeCustomValues({}, body.custom_fields, defs)
        : {};
    const ownerId = await this.resolveOwner(agent, body.assign_to);

    if (body.force !== true) {
      const duplicates = await this.findDuplicates(agent, input);
      if (duplicates.length > 0) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'duplicate_lead',
          message: 'This looks like a lead we already have.',
          duplicates,
        });
      }
    }

    const { data, error } = await this.withColumns((columns) =>
      this.db
        .from('demo_requests')
        .insert(
          this.buildInsert(input, { ownerId, createdBy: agent.id, custom }),
        )
        .select(columns)
        .single(),
    );
    if (error) this.fail('Lead create failed', error);
    const row = data as unknown as LeadRow;
    await this.logActivity({
      lead_id: row.id,
      affiliate_id: agent.id,
      type: 'created',
      body: 'Lead added manually',
    });
    return this.toView(row, agent);
  }

  async update(
    id: string,
    agent: LeadAgent,
    changes: Record<string, unknown>,
  ): Promise<LeadView> {
    const row = await this.loadOwned(id, agent);
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (changes.status !== undefined) {
      if (
        typeof changes.status !== 'string' ||
        !LEAD_STATUS_UPDATES.includes(changes.status)
      ) {
        throw new BadRequestException(
          `Status must be one of: ${LEAD_STATUS_UPDATES.join(', ')}.`,
        );
      }
      patch.status = changes.status;
    }
    if (changes.notes !== undefined) {
      if (typeof changes.notes !== 'string' || changes.notes.length > 2000) {
        throw new BadRequestException(
          'Notes must be text of 2000 characters or fewer.',
        );
      }
      patch.notes = changes.notes.trim();
    }
    if (
      (patch.status !== undefined || patch.notes !== undefined) &&
      row.claimed_by_affiliate_id === null
    ) {
      throw new BadRequestException('Claim this lead before updating it.');
    }

    const { custom_fields: customFields, force } = changes;
    const fieldBody: Record<string, unknown> = { ...changes };
    for (const key of ['status', 'notes', 'source', 'custom_fields', 'force']) {
      delete fieldBody[key];
    }
    const fields = parseLeadInput(fieldBody, { partial: true });
    Object.assign(patch, fields);

    if (customFields !== undefined) {
      const defs = await loadCustomFieldDefs(this.db);
      patch.custom_fields = mergeCustomValues(
        row.custom_fields,
        customFields,
        defs,
      );
    }

    const changedKeys = {
      phone:
        fields.phone !== undefined && fields.phone !== row.phone
          ? fields.phone
          : null,
      email:
        fields.email !== undefined && fields.email !== (row.email ?? null)
          ? fields.email
          : null,
      business_name:
        fields.business_name !== undefined &&
        fields.business_name !== (row.business_name ?? null)
          ? fields.business_name
          : null,
    };
    if (
      force !== true &&
      (changedKeys.phone || changedKeys.email || changedKeys.business_name)
    ) {
      const duplicates = await this.findDuplicates(agent, changedKeys, id);
      if (duplicates.length > 0) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'duplicate_lead',
          message: 'Another lead already has these details.',
          duplicates,
        });
      }
    }

    const { data, error } = await this.withColumns((columns) =>
      this.db
        .from('demo_requests')
        .update(patch)
        .eq('id', id)
        .select(columns)
        .single(),
    );
    if (error) this.fail('Lead update failed', error);
    if (typeof patch.status === 'string' && patch.status !== row.status) {
      await this.logActivity({
        lead_id: id,
        affiliate_id: agent.id,
        type: 'status_change',
        body: `Status changed from ${row.status} to ${patch.status}`,
      });
    }
    return this.toView(data as unknown as LeadRow, agent);
  }

  /** Manager only. Removes the lead, its activity and its attached files. */
  async remove(id: string, agent: LeadAgent): Promise<{ deleted: true }> {
    this.requireManager(agent);
    this.requireId(id);
    const { data: files } = await this.db
      .from('lead_attachments')
      .select('storage_path')
      .eq('lead_id', id);
    const { data, error } = await this.db
      .from('demo_requests')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) this.fail('Lead delete failed', error);
    if (!data) throw new NotFoundException('Lead not found.');
    const paths = ((files ?? []) as Array<{ storage_path: string }>).map(
      (file) => file.storage_path,
    );
    if (paths.length > 0) {
      try {
        await this.db.storage.from(ATTACHMENT_BUCKET).remove(paths);
      } catch (err) {
        this.logger.warn(`Could not remove attachment files: ${String(err)}`);
      }
    }
    return { deleted: true };
  }

  // ─── Team assignment ─────────────────────────────────────────────────────

  /** Manager only. Hands a lead to an agent, or returns it to the pool when affiliate_id is empty. */
  async assign(
    id: string,
    agent: LeadAgent,
    body: { affiliate_id?: unknown },
  ): Promise<LeadView> {
    this.requireManager(agent);
    const row = await this.loadRow(id);
    if (['won', 'lost'].includes(row.status)) {
      throw new BadRequestException('Closed leads cannot be reassigned.');
    }
    const now = new Date().toISOString();
    let patch: Record<string, unknown>;
    let summary: string;
    if (
      body.affiliate_id === null ||
      body.affiliate_id === undefined ||
      body.affiliate_id === ''
    ) {
      patch = {
        status: 'new',
        claimed_by_affiliate_id: null,
        claimed_at: null,
        updated_at: now,
      };
      summary = 'Returned to the pool by the manager';
    } else {
      const target = await this.verifyAgent(body.affiliate_id as string);
      patch = {
        status: row.status === 'new' ? 'claimed' : row.status,
        claimed_by_affiliate_id: target.id,
        claimed_at: now,
        updated_at: now,
      };
      summary = `Assigned to ${target.name}`;
    }
    const { data, error } = await this.withColumns((columns) =>
      this.db
        .from('demo_requests')
        .update(patch)
        .eq('id', id)
        .select(columns)
        .single(),
    );
    if (error) this.fail('Lead assign failed', error);
    await this.logActivity({
      lead_id: id,
      affiliate_id: agent.id,
      type: 'assignment',
      body: summary,
    });
    return this.toView(data as unknown as LeadRow, agent);
  }

  /** Manager only. Assigns many open leads to one agent, or spreads them evenly across all active agents. */
  async assignBulk(
    agent: LeadAgent,
    body: { ids?: unknown; affiliate_id?: unknown; distribute?: unknown },
  ): Promise<{ assigned: number; skipped: number }> {
    this.requireManager(agent);
    if (
      !Array.isArray(body.ids) ||
      body.ids.length === 0 ||
      body.ids.length > BULK_ASSIGN_LIMIT ||
      !body.ids.every((id) => typeof id === 'string' && UUID_RE.test(id))
    ) {
      throw new BadRequestException(
        `Choose between 1 and ${BULK_ASSIGN_LIMIT} leads.`,
      );
    }
    const ids = [...new Set(body.ids as string[])];

    let targets: AgentOption[];
    if (body.distribute === true) {
      targets = (await this.listAgents(agent)).agents.filter(
        (a) => a.email !== SALES_MANAGER_EMAIL,
      );
      if (targets.length === 0) {
        throw new BadRequestException('There are no active sales agents yet.');
      }
    } else {
      targets = [await this.verifyAgent(body.affiliate_id as string)];
    }

    const { data, error } = await this.db
      .from('demo_requests')
      .select('id, status')
      .in('id', ids)
      .in('status', CLAIMABLE_STATUSES);
    if (error) this.fail('Lead bulk lookup failed', error);
    const open = (data ?? []) as Array<{ id: string; status: string }>;

    const now = new Date().toISOString();
    let assigned = 0;
    for (let i = 0; i < open.length; i++) {
      const target = targets[i % targets.length];
      const lead = open[i];
      const { error: updateError } = await this.db
        .from('demo_requests')
        .update({
          status: lead.status === 'new' ? 'claimed' : lead.status,
          claimed_by_affiliate_id: target.id,
          claimed_at: now,
          updated_at: now,
        })
        .eq('id', lead.id);
      if (updateError) this.fail('Lead bulk assign failed', updateError);
      assigned++;
      await this.logActivity({
        lead_id: lead.id,
        affiliate_id: agent.id,
        type: 'assignment',
        body: `Assigned to ${target.name}`,
      });
    }
    return { assigned, skipped: ids.length - assigned };
  }

  /** Activity logging never blocks the action that triggered it. */
  async logActivity(entry: {
    lead_id: string;
    affiliate_id: string | null;
    type: string;
    subject?: string | null;
    body?: string | null;
  }): Promise<void> {
    try {
      const { error } = await this.db.from('lead_activities').insert(entry);
      if (error && !isMissingSchema(error)) {
        this.logger.warn(`Could not log lead activity: ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`Could not log lead activity: ${String(err)}`);
    }
  }
}
