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
import {
  CUSTOM_FIELD_TYPES,
  CustomFieldDef,
  MAX_CUSTOM_FIELDS,
  fieldKeyFromLabel,
  loadCustomFieldDefs,
} from './lead-custom-fields';
import {
  LeadAgent,
  SALES_MANAGER_EMAIL,
  isMissingSchema,
} from './leads.service';
import { LEAD_TYPES, UUID_RE } from './lead-validation';

export interface CallScript {
  id: string;
  title: string;
  audience: string;
  body: string;
  is_active: boolean;
  updated_at: string;
}

const SCRIPT_COLUMNS = 'id, title, audience, body, is_active, updated_at';

/** Custom lead fields and call scripts. Everyone on the team reads them; only the sales manager changes them. */
@Injectable()
export class SalesSettingsService {
  private readonly logger = new Logger(SalesSettingsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private requireManager(agent: LeadAgent): void {
    if (agent.email !== SALES_MANAGER_EMAIL) {
      throw new ForbiddenException('Only the sales manager can do that.');
    }
  }

  private fail(what: string, error: { message: string; code?: string }): never {
    this.logger.error(`${what}: ${error.message}`);
    throw new ServiceUnavailableException(
      isMissingSchema(error)
        ? 'Lead tools are being upgraded. Please try again later.'
        : 'Please try again shortly.',
    );
  }

  private requireId(id: string, what: string): void {
    if (!UUID_RE.test(id ?? ''))
      throw new NotFoundException(`${what} not found.`);
  }

  // ─── Custom fields ───────────────────────────────────────────────────────

  async listCustomFields(): Promise<{ fields: CustomFieldDef[] }> {
    return { fields: await loadCustomFieldDefs(this.db) };
  }

  async createCustomField(
    agent: LeadAgent,
    body: { label?: unknown; field_type?: unknown; options?: unknown },
  ): Promise<CustomFieldDef> {
    this.requireManager(agent);
    if (typeof body.label !== 'string' || body.label.trim() === '') {
      throw new BadRequestException('Give the field a name.');
    }
    const label = body.label.trim();
    if (label.length > 60) {
      throw new BadRequestException(
        'Field names must be 60 characters or fewer.',
      );
    }
    const fieldKey = fieldKeyFromLabel(label);
    if (!fieldKey)
      throw new BadRequestException(
        'Use letters or numbers in the field name.',
      );
    const type = body.field_type ?? 'text';
    if (
      typeof type !== 'string' ||
      !(CUSTOM_FIELD_TYPES as readonly string[]).includes(type)
    ) {
      throw new BadRequestException(
        `Type must be one of: ${CUSTOM_FIELD_TYPES.join(', ')}.`,
      );
    }
    let options: string[] = [];
    if (type === 'select') {
      const raw = Array.isArray(body.options) ? body.options : [];
      options = [
        ...new Set(
          raw
            .filter((o): o is string => typeof o === 'string')
            .map((o) => o.trim())
            .filter(Boolean),
        ),
      ];
      if (
        options.length < 2 ||
        options.length > 20 ||
        options.some((o) => o.length > 60)
      ) {
        throw new BadRequestException(
          'A choice field needs 2 to 20 options of 60 characters or fewer.',
        );
      }
    }

    const existing = await loadCustomFieldDefs(this.db);
    if (existing.length >= MAX_CUSTOM_FIELDS) {
      throw new BadRequestException(
        `You can have up to ${MAX_CUSTOM_FIELDS} custom fields.`,
      );
    }
    if (existing.some((def) => def.field_key === fieldKey)) {
      throw new ConflictException('A field with that name already exists.');
    }

    const { data, error } = await this.db
      .from('lead_custom_fields')
      .insert({
        field_key: fieldKey,
        label,
        field_type: type,
        options,
        sort_order: existing.length,
      })
      .select('id, field_key, label, field_type, options, sort_order')
      .single();
    if (error) this.fail('Custom field create failed', error);
    return data as CustomFieldDef;
  }

  /** Values already saved on leads stay in the data but stop showing. */
  async deleteCustomField(
    agent: LeadAgent,
    id: string,
  ): Promise<{ deleted: true }> {
    this.requireManager(agent);
    this.requireId(id, 'Field');
    const { data, error } = await this.db
      .from('lead_custom_fields')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) this.fail('Custom field delete failed', error);
    if (!data) throw new NotFoundException('Field not found.');
    return { deleted: true };
  }

  // ─── Call scripts ────────────────────────────────────────────────────────

  async listScripts(agent: LeadAgent): Promise<{ scripts: CallScript[] }> {
    let query = this.db
      .from('sales_call_scripts')
      .select(SCRIPT_COLUMNS)
      .order('title', { ascending: true });
    if (agent.email !== SALES_MANAGER_EMAIL)
      query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) {
      if (isMissingSchema(error)) return { scripts: [] };
      this.fail('Script list failed', error);
    }
    return { scripts: (data ?? []) as CallScript[] };
  }

  private parseScript(body: Record<string, unknown>, partial: boolean) {
    const out: Partial<
      Pick<CallScript, 'title' | 'audience' | 'body' | 'is_active'>
    > = {};
    if (!partial || body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        throw new BadRequestException('Give the script a title.');
      }
      if (body.title.trim().length > 120) {
        throw new BadRequestException(
          'Titles must be 120 characters or fewer.',
        );
      }
      out.title = body.title.trim();
    }
    if (!partial || body.body !== undefined) {
      if (typeof body.body !== 'string' || body.body.trim() === '') {
        throw new BadRequestException('The script needs some text.');
      }
      if (body.body.length > 8000) {
        throw new BadRequestException(
          'Scripts must be 8000 characters or fewer.',
        );
      }
      out.body = body.body.trim();
    }
    if (body.audience !== undefined) {
      if (
        typeof body.audience !== 'string' ||
        (body.audience !== 'any' && !LEAD_TYPES[body.audience])
      ) {
        throw new BadRequestException('Choose who the script is for.');
      }
      out.audience = body.audience;
    }
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        throw new BadRequestException('Active must be true or false.');
      }
      out.is_active = body.is_active;
    }
    return out;
  }

  async createScript(
    agent: LeadAgent,
    body: Record<string, unknown>,
  ): Promise<CallScript> {
    this.requireManager(agent);
    const script = this.parseScript(body, false);
    const { data, error } = await this.db
      .from('sales_call_scripts')
      .insert({ audience: 'any', ...script, created_by_affiliate_id: agent.id })
      .select(SCRIPT_COLUMNS)
      .single();
    if (error) this.fail('Script create failed', error);
    return data as CallScript;
  }

  async updateScript(
    agent: LeadAgent,
    id: string,
    body: Record<string, unknown>,
  ): Promise<CallScript> {
    this.requireManager(agent);
    this.requireId(id, 'Script');
    const script = this.parseScript(body, true);
    const { data, error } = await this.db
      .from('sales_call_scripts')
      .update({ ...script, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SCRIPT_COLUMNS)
      .maybeSingle();
    if (error) this.fail('Script update failed', error);
    if (!data) throw new NotFoundException('Script not found.');
    return data as CallScript;
  }

  async deleteScript(agent: LeadAgent, id: string): Promise<{ deleted: true }> {
    this.requireManager(agent);
    this.requireId(id, 'Script');
    const { data, error } = await this.db
      .from('sales_call_scripts')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) this.fail('Script delete failed', error);
    if (!data) throw new NotFoundException('Script not found.');
    return { deleted: true };
  }
}
