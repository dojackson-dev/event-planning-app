import { BadRequestException } from '@nestjs/common';

export interface NonprofitFields {
  is_nonprofit?: boolean | null;
  nonprofit_status?: string | null;
}

export const NONPROFIT_SALES_PAUSED_MESSAGE =
  "Ticket sales are paused until this organization's non-profit status is verified.";

/** A promoter who declared itself a non-profit may only sell once IRS-verified. */
export function nonprofitSalesBlocked(
  promoter: NonprofitFields | null | undefined,
): boolean {
  return (
    Boolean(promoter?.is_nonprofit) && promoter?.nonprofit_status !== 'verified'
  );
}

export function assertNonprofitCanSell(
  promoter: NonprofitFields | null | undefined,
): void {
  if (nonprofitSalesBlocked(promoter)) {
    throw new BadRequestException(NONPROFIT_SALES_PAUSED_MESSAGE);
  }
}
