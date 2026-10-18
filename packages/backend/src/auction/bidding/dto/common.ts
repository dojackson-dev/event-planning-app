import { BadRequestException, NotFoundException } from '@nestjs/common';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Malformed ids answer 404 so probing can't tell a bad id from a missing row. */
export function parseUuidParam(value: unknown): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new NotFoundException();
  }
  return value.toLowerCase();
}

export function asBody(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestException('Invalid request body.');
  }
  return raw as Record<string, unknown>;
}

export function intField(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new BadRequestException(
      `${label} must be a whole number from ${min} to ${max}.`,
    );
  }
  return value;
}
