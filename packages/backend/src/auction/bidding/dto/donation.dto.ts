import { BadRequestException } from '@nestjs/common';
import {
  boolField,
  cents,
  MAX_IMAGES_PER_DONATION,
  optionalText,
  parseFulfillmentMethod,
  parseItemDetails,
  requiredText,
} from '../../admin/dto/auction-input';
import type { ItemDetails } from '../../admin/dto/auction-input';
import { parseImageUrls } from '../../admin/dto/org-input';
import { asBody } from './common';
import { normalizeEmail, normalizePhone, parseCode } from './register.dto';

/** Bots fill every field; a real donor never sees this one. */
export function isHoneypotTripped(raw: unknown): boolean {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return false;
  }
  const value = (raw as Record<string, unknown>).website;
  return value !== undefined && value !== null && value !== '';
}

export function parseDonorOtpStart(raw: unknown): {
  phone: string;
  name: string;
} {
  const body = asBody(raw);
  return {
    phone: normalizePhone(body.phone),
    name: requiredText(body.name, 'Name', 80),
  };
}

export function parseDonorVerify(raw: unknown): {
  phone: string;
  code: string;
} {
  const body = asBody(raw);
  return { phone: normalizePhone(body.phone), code: parseCode(body.code) };
}

export interface DonationSubmitDto extends Partial<ItemDetails> {
  donor_name: string;
  donor_business: string | null;
  donor_email: string;
  donor_phone: string;
  title: string;
  description: string;
  category: string | null;
  estimated_value_cents: number;
  image_urls: string[];
  fulfillment_method: NonNullable<ItemDetails['fulfillment_method']>;
  recognition_ok: boolean;
}

export function parseDonationSubmit(raw: unknown): DonationSubmitDto {
  const body = asBody(raw);
  if (body.recognition_ok !== undefined) {
    boolField(body.recognition_ok, 'Recognition');
  }
  if (body.estimated_value_cents === undefined) {
    throw new BadRequestException('Estimated value is required.');
  }
  return {
    ...parseItemDetails(body),
    donor_name: requiredText(body.donor_name, 'Your name', 200),
    donor_business: optionalText(
      body.donor_business ?? null,
      'Business name',
      200,
    ),
    donor_email: normalizeEmail(body.donor_email),
    donor_phone: normalizePhone(body.donor_phone),
    title: requiredText(body.title, 'Title', 200),
    description: requiredText(body.description, 'Description', 5000),
    category: optionalText(body.category ?? null, 'Category', 100),
    estimated_value_cents: cents(body.estimated_value_cents, 'Estimated value'),
    image_urls:
      body.image_urls === undefined
        ? []
        : parseImageUrls(body.image_urls, MAX_IMAGES_PER_DONATION),
    fulfillment_method: parseFulfillmentMethod(body.fulfillment_method),
    recognition_ok: body.recognition_ok === true,
  };
}
