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

export const SALES_MANAGER_EMAIL = 'sales@eventecos.com';

export const LEAD_STATUS_UPDATES = ['claimed', 'contacted', 'won', 'lost'];
const CLAIMABLE_STATUSES = ['new', 'claimed', 'contacted'];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEAD_LIMIT = 300;

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
}

export interface LeadView {
  id: string;
  name: string;
  phone: string;
  roles: string[];
  description: string | null;
  status: string;
  claimed: boolean;
  claimed_by_me: boolean;
  claimed_by_name: string | null;
  claimed_at: string | null;
  notes: string | null;
  created_at: string;
}

const COLUMNS =
  'id, name, phone, roles, description, status, claimed_by_affiliate_id, claimed_at, notes, created_at, claimed_by:affiliates!claimed_by_affiliate_id(first_name, last_name)';

/** Keeps only the last four digits so agents can't cherry-pick contacts before claiming. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : '***';
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private isManager(agent: LeadAgent): boolean {
    return agent.email === SALES_MANAGER_EMAIL;
  }

  private fail(what: string, message: string): never {
    this.logger.error(`${what}: ${message}`);
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  private requireId(id: string): void {
    if (!UUID_RE.test(id ?? '')) throw new NotFoundException('Lead not found.');
  }

  private toView(row: LeadRow, agent: LeadAgent): LeadView {
    const mine = row.claimed_by_affiliate_id === agent.id;
    const showContact = this.isManager(agent) || mine;
    const claimer = row.claimed_by;
    return {
      id: row.id,
      name: row.name,
      phone: showContact ? row.phone : maskPhone(row.phone),
      roles: demoRoleLabels(row.roles),
      description: row.description,
      status: row.status,
      claimed: row.claimed_by_affiliate_id !== null,
      claimed_by_me: mine,
      claimed_by_name: claimer
        ? `${claimer.first_name ?? ''} ${claimer.last_name ?? ''}`.trim() ||
          null
        : null,
      claimed_at: row.claimed_at,
      notes: showContact ? row.notes : null,
      created_at: row.created_at,
    };
  }

  /** The manager sees every lead; agents see unclaimed leads (phone hidden) and their own. */
  async list(agent: LeadAgent): Promise<{ leads: LeadView[] }> {
    const { data, error } = await this.db
      .from('demo_requests')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(LEAD_LIMIT);
    if (error) this.fail('Lead list failed', error.message);
    const rows = (data ?? []) as unknown as LeadRow[];
    return {
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
    const { data, error } = await this.db
      .from('demo_requests')
      .update({
        status: 'claimed',
        claimed_by_affiliate_id: agent.id,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('claimed_by_affiliate_id', null)
      .in('status', CLAIMABLE_STATUSES)
      .select(COLUMNS)
      .maybeSingle();
    if (error) this.fail('Lead claim failed', error.message);
    if (!data) {
      const { data: existing, error: lookupError } = await this.db
        .from('demo_requests')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (lookupError) this.fail('Lead lookup failed', lookupError.message);
      if (!existing) throw new NotFoundException('Lead not found.');
      throw new ConflictException('This lead was already claimed.');
    }
    return this.toView(data as unknown as LeadRow, agent);
  }

  private async loadOwned(id: string, agent: LeadAgent): Promise<LeadRow> {
    this.requireId(id);
    const { data, error } = await this.db
      .from('demo_requests')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) this.fail('Lead lookup failed', error.message);
    if (!data) throw new NotFoundException('Lead not found.');
    const row = data as unknown as LeadRow;
    if (!this.isManager(agent) && row.claimed_by_affiliate_id !== agent.id) {
      throw new ForbiddenException(
        'Only the agent who claimed this lead can change it.',
      );
    }
    return row;
  }

  /** Puts a lead back in the pool. Won and lost leads stay closed. */
  async release(id: string, agent: LeadAgent): Promise<LeadView> {
    const row = await this.loadOwned(id, agent);
    if (!['claimed', 'contacted'].includes(row.status)) {
      throw new BadRequestException(
        'Only an open claimed lead can be released.',
      );
    }
    const { data, error } = await this.db
      .from('demo_requests')
      .update({
        status: 'new',
        claimed_by_affiliate_id: null,
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(COLUMNS)
      .single();
    if (error) this.fail('Lead release failed', error.message);
    return this.toView(data as unknown as LeadRow, agent);
  }

  async update(
    id: string,
    agent: LeadAgent,
    changes: { status?: unknown; notes?: unknown },
  ): Promise<LeadView> {
    const row = await this.loadOwned(id, agent);
    const patch: Record<string, string> = {
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
    if (row.claimed_by_affiliate_id === null) {
      throw new BadRequestException('Claim this lead before updating it.');
    }
    const { data, error } = await this.db
      .from('demo_requests')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single();
    if (error) this.fail('Lead update failed', error.message);
    return this.toView(data as unknown as LeadRow, agent);
  }
}
