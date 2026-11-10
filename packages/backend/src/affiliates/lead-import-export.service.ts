import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CustomValues,
  loadCustomFieldDefs,
  mergeCustomValues,
} from './lead-custom-fields';
import {
  DuplicateCandidate,
  DuplicateReason,
  matchDuplicates,
} from './lead-duplicates';
import {
  ImportRowError,
  MAX_IMPORT_BYTES,
  buildCsv,
  parseLeadCsv,
} from './lead-csv';
import { duplicateKeys } from './lead-validation';
import { MulterFile } from './lead-activities.service';
import { LeadAgent, LeadsService, SALES_MANAGER_EMAIL } from './leads.service';

const REPORT_LIMIT = 50;
const CSV_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
];

export interface ImportSummary {
  dry_run: boolean;
  total: number;
  /** Leads saved, or that would be saved on a dry run. */
  imported: number;
  duplicates: number;
  invalid: number;
  duplicate_details: Array<{
    row: number;
    name: string;
    reasons: DuplicateReason[];
    matches: string;
  }>;
  errors: ImportRowError[];
}

@Injectable()
export class LeadImportExportService {
  private readonly logger = new Logger(LeadImportExportService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly leads: LeadsService,
  ) {}

  /** Leads the caller can see in full: their own, or every lead for the manager. */
  async exportCsv(
    agent: LeadAgent,
  ): Promise<{ filename: string; csv: string }> {
    const { leads } = await this.leads.list(agent);
    const defs = await loadCustomFieldDefs(this.supabase.getAdminClient());
    const header = [
      'Name',
      'Business',
      'Phone',
      'Email',
      'Website',
      'City',
      'State',
      'Type',
      'Source',
      'Status',
      'Assigned to',
      'Score',
      'Next follow-up',
      'Last contacted',
      'Added',
      'Description',
      'Notes',
      ...defs.map((def) => def.label),
    ];
    const rows = leads
      .filter((lead) => lead.contact_visible)
      .map((lead) => [
        lead.name,
        lead.business_name,
        lead.phone,
        lead.email,
        lead.website,
        lead.city,
        lead.state,
        lead.lead_type_label,
        lead.source_label,
        lead.status,
        lead.claimed_by_name,
        lead.score,
        lead.next_follow_up_at,
        lead.last_contacted_at,
        lead.created_at,
        lead.description,
        lead.notes,
        ...defs.map((def) => lead.custom_fields[def.field_key] ?? ''),
      ]);
    const day = new Date().toISOString().slice(0, 10);
    return {
      filename: `eventecos-leads-${day}.csv`,
      csv: buildCsv(header, rows, 2),
    };
  }

  /**
   * Reads a CSV of prospects. Rows that match an existing lead (same phone,
   * email or business name) or another row in the file are skipped, never
   * overwritten. With dryRun the file is checked and nothing is saved.
   */
  async importCsv(
    agent: LeadAgent,
    file: MulterFile | undefined,
    options: { dryRun: boolean; assignTo?: string },
  ): Promise<ImportSummary> {
    if (!file) throw new BadRequestException('Choose a CSV file to import.');
    const isCsv =
      /\.csv$/i.test(file.originalname) &&
      CSV_MIME_TYPES.includes(file.mimetype);
    if (!isCsv) throw new BadRequestException('Upload a .csv file.');
    if (file.size > MAX_IMPORT_BYTES) {
      throw new BadRequestException('The CSV must be 1 MB or smaller.');
    }

    const defs = await loadCustomFieldDefs(this.supabase.getAdminClient());
    const parsed = parseLeadCsv(file.buffer.toString('utf8'), defs);
    const errors: ImportRowError[] = [...parsed.errors];

    const isManager = agent.email === SALES_MANAGER_EMAIL;
    const assignTo = isManager ? (options.assignTo ?? 'pool') : 'me';
    let owners: Array<string | null>;
    if (assignTo === 'round_robin') {
      const agents = (await this.leads.listAgents(agent)).agents.filter(
        (a) => a.email !== SALES_MANAGER_EMAIL,
      );
      if (agents.length === 0) {
        throw new BadRequestException('There are no active sales agents yet.');
      }
      owners = agents.map((a) => a.id);
    } else {
      owners = [await this.leads.resolveOwner(agent, assignTo)];
    }

    const index: DuplicateCandidate[] = await this.leads.duplicateIndex();
    const inserts: Array<Record<string, unknown>> = [];
    const duplicateDetails: ImportSummary['duplicate_details'] = [];
    let duplicates = 0;

    for (const entry of parsed.rows) {
      let custom: CustomValues = {};
      try {
        if (Object.keys(entry.custom).length > 0) {
          custom = mergeCustomValues({}, entry.custom, defs);
        }
      } catch (err) {
        const message =
          err instanceof BadRequestException
            ? (err.getResponse() as { message?: string }).message
            : undefined;
        errors.push({
          row: entry.row,
          reason: message ?? 'Custom field is invalid.',
        });
        continue;
      }

      const keys = duplicateKeys(entry.input);
      const matches = matchDuplicates(index, keys);
      if (matches.length > 0) {
        duplicates++;
        if (duplicateDetails.length < REPORT_LIMIT) {
          duplicateDetails.push({
            row: entry.row,
            name: entry.input.name ?? '',
            reasons: [...new Set(matches.flatMap((m) => m.reasons))],
            matches: matches[0].row.business_name || matches[0].row.name,
          });
        }
        continue;
      }

      index.push({
        id: `import-row-${entry.row}`,
        name: entry.input.name ?? '',
        business_name: entry.input.business_name ?? null,
        status: 'new',
        claimed_by_affiliate_id: null,
        phone_digits: keys.phone,
        email_key: keys.email,
        business_key: keys.business,
      });
      inserts.push(
        this.leads.buildInsert(entry.input, {
          ownerId: owners[inserts.length % owners.length],
          createdBy: agent.id,
          custom,
          source: 'csv_import',
        }),
      );
    }

    if (!options.dryRun && inserts.length > 0) {
      await this.leads.insertMany(inserts);
      this.logger.log(`Lead import saved ${inserts.length} leads`);
    }

    errors.sort((a, b) => a.row - b.row);
    return {
      dry_run: options.dryRun,
      total: parsed.rows.length + parsed.errors.length,
      imported: inserts.length,
      duplicates,
      invalid: errors.length,
      duplicate_details: duplicateDetails,
      errors: errors.slice(0, REPORT_LIMIT),
    };
  }
}
