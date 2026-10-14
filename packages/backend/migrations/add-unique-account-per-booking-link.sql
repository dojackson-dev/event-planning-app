-- ================================================================
-- Enforce one booking link per account (owner/vendor/artist/promoter).
--
-- upsertBookingLink() in each service looks up the existing link via
-- `.eq('*_account_id', id).maybeSingle()` and assumes at most one row
-- can match. Without a DB constraint, a failed/ignored lookup could
-- silently insert a second row for the same account instead of
-- updating the first, causing edits to "not take effect" (whichever
-- row the public GET happens to return isn't the one just edited).
--
-- Verified against production before writing this migration: no
-- duplicate rows currently exist in any of the 4 tables, so this is
-- safe to apply directly.
-- ================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_booking_links_owner_account_unique
  ON owner_booking_links(owner_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_booking_links_vendor_account_unique
  ON vendor_booking_links(vendor_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_booking_links_artist_account_unique
  ON artist_booking_links(artist_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promoter_booking_links_promoter_account_unique
  ON promoter_booking_links(promoter_account_id);
