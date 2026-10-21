export const AUCTION_STATUSES = [
  'draft',
  'scheduled',
  'live',
  'closed',
  'settled',
  'cancelled',
] as const;
export type AuctionStatus = (typeof AUCTION_STATUSES)[number];

export const AUCTION_ITEM_STATUSES = [
  'open',
  'sold',
  'unsold',
  'reserve_not_met',
  'withdrawn',
] as const;
export type AuctionItemStatus = (typeof AUCTION_ITEM_STATUSES)[number];

export const AUCTION_SALE_MODES = ['auction', 'fixed'] as const;
export type AuctionSaleMode = (typeof AUCTION_SALE_MODES)[number];

export const AUCTION_FULFILLMENT_METHODS = [
  'pickup',
  'delivery',
  'shipping',
  'digital',
  'arranged_with_donor',
] as const;
export type AuctionFulfillmentMethod =
  (typeof AUCTION_FULFILLMENT_METHODS)[number];

export const AUCTION_CARD_STATUSES = [
  'none',
  'pending',
  'ready',
  'failed',
] as const;
export type AuctionCardStatus = (typeof AUCTION_CARD_STATUSES)[number];

export const AUCTION_ORDER_STATUSES = [
  'pending',
  'charging',
  'requires_action',
  'failed',
  'paid',
  'defaulted',
  'cancelled',
  'refunded',
] as const;
export type AuctionOrderStatus = (typeof AUCTION_ORDER_STATUSES)[number];

export const AUCTION_ORDER_KINDS = ['settlement', 'buy_now'] as const;
export type AuctionOrderKind = (typeof AUCTION_ORDER_KINDS)[number];

export const AUCTION_BID_KINDS = ['manual', 'proxy_auto'] as const;
export type AuctionBidKind = (typeof AUCTION_BID_KINDS)[number];

export const AUCTION_BID_MODES = ['manual', 'max'] as const;
export type AuctionBidMode = (typeof AUCTION_BID_MODES)[number];

export const AUCTION_OTP_CHANNELS = ['email', 'sms'] as const;
export type AuctionOtpChannel = (typeof AUCTION_OTP_CHANNELS)[number];

export const AUCTION_OUTBOX_STATUSES = [
  'pending',
  'processing',
  'sent',
  'failed',
] as const;
export type AuctionOutboxStatus = (typeof AUCTION_OUTBOX_STATUSES)[number];

/** Outbox kinds the SQL functions write; later slices may add more. */
export const AUCTION_OUTBOX_KINDS = [
  'outbid',
  'won',
  'reserve_not_met',
  'item_withdrawn',
  'order_created',
  'payment_succeeded',
  'payment_failed',
  'payment_defaulted',
] as const;
export type AuctionOutboxKind = (typeof AUCTION_OUTBOX_KINDS)[number];

export type AuctionActorType =
  | 'system'
  | 'promoter'
  | 'bidder'
  | 'admin'
  | 'webhook';

/** Timestamps arrive from PostgREST as ISO strings; all money is integer cents. */
export interface AuctionRow {
  id: string;
  promoter_account_id: string | null;
  public_event_id: string | null;
  created_by_user_id: string | null;
  title: string;
  description: string | null;
  status: AuctionStatus;
  starts_at: string | null;
  ends_at: string | null;
  hard_close_at: string | null;
  anti_snipe_window_seconds: number;
  anti_snipe_extension_seconds: number;
  payment_grace_hours: number;
  default_exposure_limit_cents: number;
  org_name: string | null;
  org_ein: string | null;
  event_title: string | null;
  event_date: string | null;
  closed_at: string | null;
  settled_at: string | null;
  organization_id?: string | null;
  slug?: string | null;
  cover_image_url?: string | null;
  accepts_donations?: boolean;
  donations_close_at?: string | null;
  page_published?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuctionBidderRow {
  id: string;
  auction_id: string;
  user_id: string | null;
  display_name: string;
  paddle_number: number | null;
  email: string;
  phone_e164: string;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  card_status: AuctionCardStatus;
  card_brand: string | null;
  card_last4: string | null;
  exposure_limit_cents: number;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionItemRow {
  id: string;
  auction_id: string;
  lot_number: number | null;
  sale_mode: AuctionSaleMode;
  title: string;
  description: string | null;
  category: string | null;
  donor_name: string | null;
  image_urls: string[];
  fair_market_value_cents: number;
  tax_code: string | null;
  sort_order: number;
  starting_bid_cents: number | null;
  reserve_cents: number | null;
  increment_cents: number | null;
  buy_now_cents: number | null;
  buy_now_available: boolean;
  fixed_price_cents: number | null;
  quantity: number;
  quantity_sold: number;
  per_bidder_limit: number | null;
  status: AuctionItemStatus;
  current_price_cents: number;
  leader_bidder_id: string | null;
  bid_count: number;
  ends_at: string | null;
  winning_bidder_id: string | null;
  final_price_cents: number | null;
  sold_via: 'auction' | 'buy_now' | null;
  closed_at: string | null;
  condition?: string | null;
  specifications?: string | null;
  whats_included?: string | null;
  restrictions?: string | null;
  expires_on?: string | null;
  fulfillment_method?: AuctionFulfillmentMethod | null;
  fulfillment_details?: string | null;
  is_experience?: boolean;
  scheduling_requirements?: string | null;
  blackout_dates?: string | null;
  donor_business?: string | null;
  donor_recognition?: boolean;
  source_donation_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionBidRow {
  id: number;
  item_id: string;
  bidder_id: string;
  amount_cents: number;
  max_amount_cents: number | null;
  kind: AuctionBidKind;
  created_at: string;
}

export interface AuctionProxyBidRow {
  id: string;
  item_id: string;
  bidder_id: string;
  max_amount_cents: number;
  created_at: string;
  updated_at: string;
}

export interface AuctionOrderRow {
  id: string;
  auction_id: string | null;
  public_event_id: string | null;
  promoter_account_id: string | null;
  bidder_id: string | null;
  kind: AuctionOrderKind;
  status: AuctionOrderStatus;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  auction_title: string;
  event_title: string | null;
  org_name: string | null;
  org_ein: string | null;
  subtotal_cents: number;
  tax_cents: number;
  processing_fee_cents: number;
  platform_fee_cents: number;
  total_cents: number;
  application_fee_cents: number;
  platform_fee_rate: number;
  tax_calculation_id: string | null;
  tax_transaction_id: string | null;
  tax_jurisdiction: Record<string, unknown> | null;
  stripe_payment_intent_id: string | null;
  amount_received_cents: number | null;
  paid_at: string | null;
  pay_by_at: string;
  charge_attempts: number;
  next_charge_at: string;
  claimed_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionOrderItemRow {
  id: string;
  order_id: string;
  item_id: string | null;
  title: string;
  lot_number: number | null;
  sale_mode: AuctionSaleMode;
  quantity: number;
  price_cents: number;
  fair_market_value_cents: number;
  tax_code: string | null;
  created_at: string;
}

export interface AuctionOtpRow {
  id: string;
  bidder_id: string;
  channel: AuctionOtpChannel;
  destination: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export interface AuctionOutboxRow {
  id: number;
  auction_id: string | null;
  item_id: string | null;
  order_id: string | null;
  bidder_id: string | null;
  kind: string;
  payload: Record<string, unknown>;
  status: AuctionOutboxStatus;
  attempts: number;
  next_attempt_at: string;
  locked_at: string | null;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface AuctionAuditRow {
  id: number;
  auction_id: string | null;
  actor_type: AuctionActorType;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

/** RPCs return `{ ok: false, code }` for expected failures instead of raising. */
export interface AuctionRpcFailure<C extends string> {
  ok: false;
  code: C;
  min_next_bid_cents?: number;
  your_max_cents?: number | null;
  exposure_limit_cents?: number;
}

export type BidderGateCode =
  | 'bidder_not_found'
  | 'item_not_found'
  | 'auction_not_live'
  | 'item_closed'
  | 'bidder_blocked'
  | 'email_not_verified'
  | 'phone_not_verified'
  | 'card_not_ready'
  | 'exposure_limit';

export type PlaceBidErrorCode =
  | BidderGateCode
  | 'invalid_request'
  | 'not_an_auction_item'
  | 'max_not_raised'
  | 'bid_too_low';

export type PlaceBidOutcome = 'leading' | 'outbid' | 'max_raised';

export interface PlaceBidSuccess {
  ok: true;
  outcome: PlaceBidOutcome;
  current_price_cents: number;
  leader_bidder_id: string;
  your_max_cents: number;
  you_are_leading: boolean;
  min_next_bid_cents: number;
  bid_count: number;
  ends_at: string;
  extended: boolean;
  reserve_met: boolean;
  buy_now_available: boolean;
}

export type PlaceBidResult =
  | PlaceBidSuccess
  | AuctionRpcFailure<PlaceBidErrorCode>;

export type ClaimItemNowErrorCode =
  | BidderGateCode
  | 'invalid_rate'
  | 'not_an_auction_item'
  | 'bidding_started'
  | 'buy_now_unavailable';

export interface ClaimItemNowSuccess {
  ok: true;
  order_id: string;
  item_id: string;
  price_cents: number;
}

export type ClaimItemNowResult =
  | ClaimItemNowSuccess
  | AuctionRpcFailure<ClaimItemNowErrorCode>;

export type ResolveReserveResult =
  | { ok: true; accepted: boolean }
  | AuctionRpcFailure<'not_pending_decision'>;

export type ClaimFixedItemErrorCode =
  | BidderGateCode
  | 'invalid_rate'
  | 'invalid_request'
  | 'not_a_fixed_item'
  | 'insufficient_quantity'
  | 'per_bidder_limit';

export interface ClaimFixedItemSuccess {
  ok: true;
  order_id: string;
  item_id: string;
  subtotal_cents: number;
  quantity: number;
}

export type ClaimFixedItemResult =
  | ClaimFixedItemSuccess
  | (AuctionRpcFailure<ClaimFixedItemErrorCode> & {
      remaining?: number;
      limit?: number;
    });

export type SettleAuctionErrorCode =
  | 'invalid_rate'
  | 'auction_not_found'
  | 'auction_not_settleable'
  | 'items_still_open'
  | 'items_awaiting_decision';

export interface SettleAuctionSuccess {
  ok: true;
  orders_created: number;
  bidders_skipped: number;
  subtotal_cents: number;
}

export type SettleAuctionResult =
  | SettleAuctionSuccess
  | AuctionRpcFailure<SettleAuctionErrorCode>;

/** close_due_auction_items returns the closed rows; claim_orders_for_charge returns claimed orders. */
export type CloseDueItemsResult = AuctionItemRow[];
export type ClaimOrdersResult = AuctionOrderRow[];
export type ClaimOutboxResult = AuctionOutboxRow[];

/** mark_auction_order_failed: null when the order is unknown or not chargeable. */
export type MarkOrderFailedResult =
  | 'failed'
  | 'requires_action'
  | 'defaulted'
  | null;

/** Argument names match the SQL parameters (PostgREST rpc named args). */
export interface PlaceBidArgs {
  p_item_id: string;
  p_bidder_id: string;
  p_amount_cents: number;
  p_mode: AuctionBidMode;
}

export interface ClaimItemNowArgs {
  p_item_id: string;
  p_bidder_id: string;
  p_platform_fee_rate: number;
}

export interface SettleAuctionArgs {
  p_auction_id: string;
  p_platform_fee_rate: number;
  p_payment_grace_hours?: number | null;
}

export interface SetOrderAmountsArgs {
  p_order_id: string;
  p_tax_cents: number;
  p_processing_fee_cents: number;
  p_platform_fee_cents: number;
  p_total_cents: number;
  p_application_fee_cents: number;
  p_tax_calculation_id?: string | null;
  p_tax_jurisdiction?: Record<string, unknown> | null;
}

export interface MarkOrderPaidArgs {
  p_order_id: string;
  p_payment_intent: string;
  p_amount_received_cents: number;
  p_tax_transaction_id?: string | null;
}

export interface MarkOrderFailedArgs {
  p_order_id: string;
  p_error_code: string;
  p_error_message: string;
  p_requires_action?: boolean;
  p_retry_after_seconds?: number;
}
