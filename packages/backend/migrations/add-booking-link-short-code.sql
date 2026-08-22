-- ================================================================
-- Add short_code to vendor_booking_links
-- Short codes are auto-generated 6-char alphanumeric IDs used
-- for shorter shareable URLs like /b/abc123
-- ================================================================

ALTER TABLE vendor_booking_links
  ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_booking_links_short_code
  ON vendor_booking_links(short_code)
  WHERE short_code IS NOT NULL;

-- Back-fill existing rows with a random 6-char code
UPDATE vendor_booking_links
SET short_code = LOWER(SUBSTRING(MD5(id::TEXT || RANDOM()::TEXT), 1, 6))
WHERE short_code IS NULL;
