import { BadRequestException } from '@nestjs/common';

export const CATALOG_UNITS = ['each', 'hour', 'person', 'flat'] as const;
export type CatalogUnit = (typeof CATALOG_UNITS)[number];
export type CatalogKind = 'item' | 'package';

/** Wording that follows the item name on an estimate line. */
export const UNIT_SUFFIX: Record<CatalogUnit, string> = {
  each: '',
  hour: 'per hour',
  person: 'per person',
  flat: 'flat fee',
};

export const MAX_REQUESTED_LINES = 50;
export const MAX_QUANTITY = 10000;
export const MAX_PRICE = 1_000_000;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export interface IncludedItem {
  name: string;
  quantity: number;
}

/** What goes in the description of an estimate or invoice line for a catalog entry. */
export function lineDescription(item: {
  name: string;
  kind?: string | null;
  unit?: string | null;
  includes?: IncludedItem[] | null;
}): string {
  let text = item.name;
  const suffix = UNIT_SUFFIX[(item.unit as CatalogUnit) ?? 'each'] ?? '';
  if (suffix) text += ` (${suffix})`;
  if (item.kind === 'package' && item.includes?.length) {
    const parts = item.includes.map((i) =>
      i.quantity === 1 ? i.name : `${i.name} ×${i.quantity}`,
    );
    text += ` — includes: ${parts.join(', ')}`;
  }
  return text;
}

export interface CatalogItemFields {
  name?: string;
  description?: string | null;
  section?: string | null;
  kind?: CatalogKind;
  unit?: CatalogUnit;
  price?: number;
  hide_price?: boolean;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface IncludeInput {
  item_id: string;
  quantity: number;
}

const text = (
  value: unknown,
  label: string,
  max: number,
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`The ${label} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new BadRequestException(
      `The ${label} can be at most ${max} characters.`,
    );
  }
  return trimmed || null;
};

/**
 * Checks and cleans what a vendor sent for an item. On create the name is required;
 * on update only the fields that are present are returned.
 */
export function sanitizeCatalogItem(
  input: Record<string, unknown>,
  mode: 'create' | 'update',
): CatalogItemFields {
  const out: CatalogItemFields = {};

  const name = text(input.name, 'name', 120);
  if (mode === 'create' && !name) {
    throw new BadRequestException('Enter a name for the item.');
  }
  if (name !== undefined) {
    if (!name) throw new BadRequestException('Enter a name for the item.');
    out.name = name;
  }

  const description = text(input.description, 'description', 1000);
  if (description !== undefined) out.description = description;
  const section = text(input.section, 'section', 60);
  if (section !== undefined) out.section = section;

  if (input.kind !== undefined && mode === 'create') {
    if (input.kind !== 'item' && input.kind !== 'package') {
      throw new BadRequestException('The type must be item or package.');
    }
    out.kind = input.kind;
  }

  if (input.unit !== undefined) {
    if (!CATALOG_UNITS.includes(input.unit as CatalogUnit)) {
      throw new BadRequestException(
        'The unit must be each, hour, person or flat.',
      );
    }
    out.unit = input.unit as CatalogUnit;
  }

  if (input.price !== undefined) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
      throw new BadRequestException(
        `The price must be between 0 and ${MAX_PRICE}.`,
      );
    }
    out.price = round2(price);
  }

  for (const key of ['hide_price', 'is_active'] as const) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'boolean') {
        throw new BadRequestException(`${key} must be true or false.`);
      }
      out[key] = input[key];
    }
  }

  if (input.image_url !== undefined) {
    if (input.image_url === null || input.image_url === '') {
      out.image_url = null;
    } else if (
      typeof input.image_url !== 'string' ||
      input.image_url.length > 500 ||
      !/^https:\/\//i.test(input.image_url)
    ) {
      throw new BadRequestException('The photo link is not valid.');
    } else out.image_url = input.image_url;
  }

  if (input.sort_order !== undefined) {
    const order = Number(input.sort_order);
    if (!Number.isInteger(order) || Math.abs(order) > 100000) {
      throw new BadRequestException('The sort order must be a whole number.');
    }
    out.sort_order = order;
  }

  if (out.hide_price && mode === 'create' && out.price === undefined) {
    out.price = 0;
  }
  return out;
}

/** Items bundled in a package: each must be a positive quantity of a different item. */
export function sanitizeIncludes(input: unknown): IncludeInput[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > MAX_REQUESTED_LINES) {
    throw new BadRequestException('The package contents are not valid.');
  }
  const merged = new Map<string, number>();
  for (const row of input as Array<Record<string, unknown>>) {
    const id = row?.item_id;
    const quantity = Number(row?.quantity ?? 1);
    if (typeof id !== 'string' || !id) {
      throw new BadRequestException('The package contents are not valid.');
    }
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QUANTITY
    ) {
      throw new BadRequestException(
        'Each included item needs a quantity above zero.',
      );
    }
    merged.set(id, round3((merged.get(id) ?? 0) + quantity));
  }
  return [...merged.entries()].map(([item_id, quantity]) => ({
    item_id,
    quantity,
  }));
}

export interface RequestedItem {
  item_id: string;
  name: string;
  kind: CatalogKind;
  unit: CatalogUnit;
  quantity: number;
  /** null when the vendor hides the price, so the client sees "Request quote". */
  unit_price: number | null;
  description: string | null;
  includes: IncludedItem[];
}

export interface RequestedItemInput {
  item_id: string;
  quantity: number;
}

/** Cleans the list of picks a client sends (the server still checks each one against the catalog). */
export function sanitizeRequestedInput(input: unknown): RequestedItemInput[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) {
    throw new BadRequestException('The selected items are not valid.');
  }
  if (input.length > MAX_REQUESTED_LINES) {
    throw new BadRequestException(
      `You can request at most ${MAX_REQUESTED_LINES} different items.`,
    );
  }
  const merged = new Map<string, number>();
  for (const row of input as Array<Record<string, unknown>>) {
    const id = row?.item_id;
    const quantity = Number(row?.quantity);
    if (typeof id !== 'string' || !id) {
      throw new BadRequestException('The selected items are not valid.');
    }
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QUANTITY
    ) {
      throw new BadRequestException(
        'Each selected item needs a quantity above zero.',
      );
    }
    merged.set(id, round3((merged.get(id) ?? 0) + quantity));
  }
  return [...merged.entries()].map(([item_id, quantity]) => ({
    item_id,
    quantity,
  }));
}
