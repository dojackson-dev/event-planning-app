import { BadRequestException } from '@nestjs/common';

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'select'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export const MAX_CUSTOM_FIELDS = 25;

export interface CustomFieldDef {
  id: string;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  sort_order: number;
}

export type CustomValues = Record<string, string | number>;

/** Slug used as the JSON key a value is stored under, e.g. "Guest Count" -> "guest_count". */
export function fieldKeyFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/**
 * Checks submitted custom values against the field definitions and merges them
 * into the lead's existing values. An empty value or null removes the field.
 */
export function mergeCustomValues(
  existing: unknown,
  submitted: unknown,
  defs: CustomFieldDef[],
): CustomValues {
  if (
    submitted === null ||
    typeof submitted !== 'object' ||
    Array.isArray(submitted)
  ) {
    throw new BadRequestException('Custom fields must be an object.');
  }
  const merged: CustomValues = {
    ...((existing && typeof existing === 'object'
      ? existing
      : {}) as CustomValues),
  };
  const byKey = new Map(defs.map((def) => [def.field_key, def]));

  for (const [key, value] of Object.entries(
    submitted as Record<string, unknown>,
  )) {
    const def = byKey.get(key);
    if (!def) throw new BadRequestException(`Unknown custom field "${key}".`);
    if (value === null || value === undefined || value === '') {
      delete merged[key];
      continue;
    }
    if (def.field_type === 'number') {
      const num = typeof value === 'number' ? value : Number(value);
      if (typeof value === 'boolean' || !Number.isFinite(num)) {
        throw new BadRequestException(`${def.label} must be a number.`);
      }
      merged[key] = num;
      continue;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(`${def.label} must be text.`);
    }
    const text = value.trim();
    if (text.length > 500) {
      throw new BadRequestException(
        `${def.label} must be 500 characters or fewer.`,
      );
    }
    if (def.field_type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new BadRequestException(
        `${def.label} must be a date (YYYY-MM-DD).`,
      );
    }
    if (def.field_type === 'select' && !def.options.includes(text)) {
      throw new BadRequestException(
        `${def.label} must be one of: ${def.options.join(', ')}.`,
      );
    }
    if (text === '') delete merged[key];
    else merged[key] = text;
  }
  return merged;
}

/** Reads the field definitions. Returns [] when the CRM tables are not installed yet. */
export async function loadCustomFieldDefs(db: {
  from: (table: string) => any;
}): Promise<CustomFieldDef[]> {
  const { data, error } = await db
    .from('lead_custom_fields')
    .select('id, field_key, label, field_type, options, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return [];
  return ((data ?? []) as CustomFieldDef[]).map((def) => ({
    ...def,
    options: def.options ?? [],
  }));
}
