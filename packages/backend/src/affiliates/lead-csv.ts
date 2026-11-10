import { BadRequestException } from '@nestjs/common';
import { CustomFieldDef } from './lead-custom-fields';
import {
  LeadInput,
  mapLeadType,
  normalizeEmail,
  normalizeFollowUp,
  normalizePhone,
  normalizeWebsite,
} from './lead-validation';

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 1024 * 1024;

/** Reads RFC 4180 CSV: quoted cells, escaped quotes, commas and line breaks inside quotes. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (quoted) throw new BadRequestException('The CSV has an unclosed quote.');
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Cells that start with = + - @ are read as formulas by spreadsheet apps, so
 * they get a leading apostrophe. Phone numbers such as +1 404 555 0123 are left alone.
 */
export function safeCsvCell(value: unknown, isPhone = false): string {
  let text =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : '';
  if (/^[=+@\t\r-]/.test(text) && !(isPhone && /^\+[\d\s().-]+$/.test(text))) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(
  header: string[],
  rows: Array<Array<unknown>>,
  phoneColumn = -1,
): string {
  const lines = [header.map((h) => safeCsvCell(h)).join(',')];
  for (const row of rows) {
    lines.push(row.map((c, i) => safeCsvCell(c, i === phoneColumn)).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

type Field =
  | 'name'
  | 'first_name'
  | 'last_name'
  | 'business_name'
  | 'phone'
  | 'email'
  | 'website'
  | 'city'
  | 'state'
  | 'lead_type'
  | 'description'
  | 'notes'
  | 'next_follow_up_at';

const HEADER_ALIASES: Record<Field, string[]> = {
  name: ['name', 'full name', 'contact', 'contact name', 'lead name'],
  first_name: ['first name', 'firstname', 'first'],
  last_name: ['last name', 'lastname', 'last', 'surname'],
  business_name: [
    'business',
    'business name',
    'company',
    'company name',
    'organization',
    'organisation',
  ],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'tel'],
  email: ['email', 'e-mail', 'email address'],
  website: ['website', 'web site', 'url', 'site', 'web'],
  city: ['city', 'town'],
  state: ['state', 'st', 'region', 'province'],
  lead_type: ['type', 'lead type', 'category', 'industry', 'segment'],
  description: ['description', 'details', 'about'],
  notes: ['notes', 'note', 'comments'],
  next_follow_up_at: [
    'follow up',
    'follow-up',
    'next follow up',
    'next follow-up',
  ],
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ');
}

export interface ImportRow {
  row: number;
  input: LeadInput;
  custom: Record<string, string>;
}

export interface ImportRowError {
  row: number;
  reason: string;
}

export interface ParsedImport {
  rows: ImportRow[];
  errors: ImportRowError[];
  recognized: string[];
}

/** Turns CSV text into validated lead inputs, collecting a reason for every row that cannot be used. */
export function parseLeadCsv(
  csv: string,
  customDefs: CustomFieldDef[],
): ParsedImport {
  const table = parseCsv(csv);
  if (table.length < 2) {
    throw new BadRequestException(
      'The CSV needs a header row and at least one lead.',
    );
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    throw new BadRequestException(
      `Import up to ${MAX_IMPORT_ROWS} leads at a time.`,
    );
  }

  const headers = table[0].map(normalizeHeader);
  const fieldColumn = new Map<Field, number>();
  const customColumn = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const field = (Object.keys(HEADER_ALIASES) as Field[]).find((f) =>
      HEADER_ALIASES[f].includes(header),
    );
    if (field) {
      if (!fieldColumn.has(field)) fieldColumn.set(field, i);
      continue;
    }
    const def = customDefs.find((d) => normalizeHeader(d.label) === header);
    if (def && !customColumn.has(def.field_key))
      customColumn.set(def.field_key, i);
  }

  const hasName =
    fieldColumn.has('name') ||
    fieldColumn.has('first_name') ||
    fieldColumn.has('business_name');
  if (!hasName || !fieldColumn.has('phone')) {
    throw new BadRequestException(
      'The CSV needs a Name (or Business) column and a Phone column.',
    );
  }

  const rows: ImportRow[] = [];
  const errors: ImportRowError[] = [];
  const get = (cells: string[], field: Field) => {
    const index = fieldColumn.get(field);
    return index === undefined ? '' : (cells[index] ?? '').trim();
  };

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const rowNumber = r + 1;
    try {
      const business = get(cells, 'business_name');
      const name =
        get(cells, 'name') ||
        `${get(cells, 'first_name')} ${get(cells, 'last_name')}`.trim() ||
        business;
      if (!name) throw new BadRequestException('Name is required.');
      if (name.length > 120) {
        throw new BadRequestException('Name must be 120 characters or fewer.');
      }
      if (business.length > 160) {
        throw new BadRequestException('Business name is too long.');
      }

      const input: LeadInput = {
        name,
        phone: normalizePhone(get(cells, 'phone')),
        business_name: business || null,
        email: normalizeEmail(get(cells, 'email')),
        website: normalizeWebsite(get(cells, 'website')),
        city: get(cells, 'city').slice(0, 80) || null,
        state: get(cells, 'state').slice(0, 40) || null,
        lead_type: mapLeadType(get(cells, 'lead_type')),
        source: 'csv_import',
        description: get(cells, 'description').slice(0, 2000) || null,
        notes: get(cells, 'notes').slice(0, 2000) || null,
        next_follow_up_at: normalizeFollowUp(get(cells, 'next_follow_up_at')),
      };
      const custom: Record<string, string> = {};
      for (const [key, index] of customColumn) {
        const value = (cells[index] ?? '').trim();
        if (value) custom[key] = value;
      }
      rows.push({ row: rowNumber, input, custom });
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? (err.getResponse() as { message?: string }).message
          : undefined;
      errors.push({
        row: rowNumber,
        reason: message ?? 'This row could not be read.',
      });
    }
  }

  return {
    rows,
    errors,
    recognized: [
      ...fieldColumn.keys(),
      ...[...customColumn.keys()].map((key) => `custom:${key}`),
    ],
  };
}
