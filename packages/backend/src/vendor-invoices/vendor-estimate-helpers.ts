import { BadRequestException } from '@nestjs/common';

export interface EstimateLine {
  description: string;
  quantity: number;
  unit_price: number;
}

/** Estimate states from which the vendor may still change the numbers. */
export const EDITABLE_ESTIMATE_STATUSES = ['draft', 'sent', 'viewed'];

/** States from which the vendor can turn the estimate into an invoice. */
export const CONVERTIBLE_ESTIMATE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'approved',
];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function estimateTotals(
  items: Pick<EstimateLine, 'quantity' | 'unit_price'>[],
  taxRate: number,
  discountAmount: number,
) {
  const subtotal = round2(
    items.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
      0,
    ),
  );
  const taxAmount = round2(subtotal * (Number(taxRate) / 100));
  const totalAmount = Math.max(
    0,
    round2(subtotal + taxAmount - Number(discountAmount)),
  );
  return { subtotal, taxAmount, totalAmount };
}

/** Throws a readable 400 for anything that would otherwise surface as a database error. */
export function validateEstimateInput(input: {
  client_name?: string;
  client_email?: string | null;
  issue_date?: string;
  expiration_date?: string;
  tax_rate?: number;
  discount_amount?: number;
  items?: EstimateLine[];
}) {
  if (input.client_name !== undefined && !input.client_name.trim()) {
    throw new BadRequestException('Enter the client name.');
  }
  if (
    input.client_email &&
    !/^\S+@\S+\.\S+$/.test(String(input.client_email).trim())
  ) {
    throw new BadRequestException('Enter a valid client email address.');
  }
  for (const [label, value] of [
    ['issue date', input.issue_date],
    ['expiration date', input.expiration_date],
  ] as const) {
    if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      throw new BadRequestException(`Choose the ${label}.`);
    }
  }
  if (
    input.issue_date &&
    input.expiration_date &&
    input.expiration_date < input.issue_date
  ) {
    throw new BadRequestException(
      'The expiration date cannot be before the issue date.',
    );
  }
  for (const [label, value] of [
    ['tax rate', input.tax_rate],
    ['discount', input.discount_amount],
  ] as const) {
    if (
      value !== undefined &&
      (!Number.isFinite(Number(value)) || Number(value) < 0)
    ) {
      throw new BadRequestException(`The ${label} must be zero or more.`);
    }
  }
  if (input.items !== undefined) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('Add at least one line item.');
    }
    for (const item of input.items) {
      if (!String(item.description ?? '').trim()) {
        throw new BadRequestException('Each line item needs a description.');
      }
      if (
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        throw new BadRequestException('Each quantity must be more than zero.');
      }
      if (
        !Number.isFinite(Number(item.unit_price)) ||
        Number(item.unit_price) < 0
      ) {
        throw new BadRequestException('Each unit price must be zero or more.');
      }
    }
  }
}

export function nextEstimateNumber(
  prefix: string,
  latest: string | null | undefined,
): string {
  let seq = 1;
  const match = latest?.match(/-(\d+)$/);
  if (match) seq = parseInt(match[1], 10) + 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
}
