/**
 * Request bodies for the promoter auction admin API. The app has no global
 * ValidationPipe, so every field is validated in dto/auction-input.ts.
 * All money fields are integer cents.
 */
export class CreateAuctionDto {
  title?: string;
  description?: string | null;
  public_event_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  anti_snipe_window_seconds?: number;
  anti_snipe_extension_seconds?: number;
  payment_grace_hours?: number;
  default_exposure_limit_cents?: number;
}

export class UpdateAuctionDto extends CreateAuctionDto {}

export class AuctionItemDto {
  sale_mode?: 'auction' | 'fixed';
  title?: string;
  description?: string | null;
  category?: string | null;
  donor_name?: string | null;
  image_urls?: string[];
  fair_market_value_cents?: number;
  tax_code?: string | null;
  starting_bid_cents?: number | null;
  reserve_cents?: number | null;
  increment_cents?: number | null;
  buy_now_cents?: number | null;
  fixed_price_cents?: number | null;
  quantity?: number;
  per_bidder_limit?: number | null;
  lot_number?: number | null;
  sort_order?: number;
}

export class ResolveReserveDto {
  accept?: boolean;
}

export class BlockBidderDto {
  reason?: string;
}

export class MarkPaidOfflineDto {
  note?: string;
}
