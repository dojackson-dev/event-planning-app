/** Cross-slice contract: the payments slice implements this; admin and bidding slices only depend on the interface. */
export const AUCTION_ORDER_CHARGER = Symbol('AUCTION_ORDER_CHARGER');

export type ChargeOutcomeStatus =
  | 'paid'
  | 'failed'
  | 'requires_action'
  | 'pending'
  | 'skipped';

export interface ChargeOutcome {
  orderId: string;
  status: ChargeOutcomeStatus;
  /** Pay-link URL when the bidder must act (3-D Secure, new card). */
  payUrl?: string;
  message?: string;
}

export interface AuctionOrderCharger {
  /** Fills in fee/tax amounts if unset, then charges the saved card off-session (used for buy-it-now and fixed-price purchases). */
  chargeOrderNow(orderId: string): Promise<ChargeOutcome>;
  /** Promoter-triggered retry of a failed or requires_action order. */
  retryCharge(orderId: string): Promise<ChargeOutcome>;
  /** Emails and texts the bidder a pay link for the order. */
  sendPayLink(orderId: string): Promise<{ sent: boolean }>;
}
