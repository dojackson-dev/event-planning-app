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
  /** URL slug, unique within the organization. */
  slug?: string | null;
  cover_image_url?: string | null;
  accepts_donations?: boolean;
  donations_close_at?: string | null;
  page_published?: boolean;
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
  condition?: string | null;
  specifications?: string | null;
  whats_included?: string | null;
  restrictions?: string | null;
  expires_on?: string | null;
  fulfillment_method?:
    | 'pickup'
    | 'delivery'
    | 'shipping'
    | 'digital'
    | 'arranged_with_donor'
    | null;
  fulfillment_details?: string | null;
  is_experience?: boolean;
  scheduling_requirements?: string | null;
  blackout_dates?: string | null;
  donor_business?: string | null;
  donor_recognition?: boolean;
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
