-- ================================================================
-- Auction Center: bidder identity / bidding additions (Slice C)
-- Run AFTER create-auctions.sql and create-auction-functions.sql. Idempotent.
-- ================================================================

-- Card-on-file authorization record captured at registration
ALTER TABLE auction_bidders ADD COLUMN IF NOT EXISTS auth_terms_version TEXT;
ALTER TABLE auction_bidders ADD COLUMN IF NOT EXISTS auth_accepted_at TIMESTAMPTZ;
ALTER TABLE auction_bidders ADD COLUMN IF NOT EXISTS auth_ip_hash TEXT;
ALTER TABLE auction_bidders ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT false;

-- Bumped on every token issuance; older signed tokens stop working
ALTER TABLE auction_bidders ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- HMAC of the requester IP (never the raw address) for per-IP OTP limits
ALTER TABLE auction_otps ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- OTP send limits are counted from this table
CREATE INDEX IF NOT EXISTS idx_auction_otps_destination_created
  ON auction_otps (destination, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_otps_ip_created
  ON auction_otps (ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auction_otps_channel_created
  ON auction_otps (channel, created_at DESC);

-- Registration looks bidders up by auction + email / phone (covered by the
-- unique indexes from create-auctions.sql); the paddle lookup uses uq_auction_bidders_paddle.

NOTIFY pgrst, 'reload schema';
