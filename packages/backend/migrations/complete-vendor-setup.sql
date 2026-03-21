-- ================================================================
-- COMPLETE VENDOR + STRIPE CONNECT SETUP
-- Run this once in Supabase SQL Editor.
-- Safe to re-run: all statements use IF NOT EXISTS / DO blocks.
-- ================================================================


-- ----------------------------------------------------------------
-- 1. Add 'vendor' to user_role enum
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'vendor'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'vendor';
    RAISE NOTICE 'Added vendor to user_role enum';
  ELSE
    RAISE NOTICE 'vendor already exists in user_role enum';
  END IF;
END $$;


-- ----------------------------------------------------------------
-- 2. vendor_accounts
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_accounts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name       VARCHAR(255)  NOT NULL,
  category            VARCHAR(100)  NOT NULL CHECK (category IN (
                        'dj', 'decorator', 'planner_coordinator', 'furniture',
                        'photographer', 'musicians', 'mc_host', 'other'
                      )),
  bio                 TEXT,
  website             VARCHAR(500),
  instagram           VARCHAR(255),
  facebook            VARCHAR(255),
  phone               VARCHAR(20),
  email               VARCHAR(255),
  -- Location
  address             TEXT,
  city                VARCHAR(100),
  state               VARCHAR(100),
  zip_code            VARCHAR(20),
  latitude            DECIMAL(10, 8),
  longitude           DECIMAL(11, 8),
  -- Pricing
  hourly_rate         DECIMAL(10, 2),
  flat_rate           DECIMAL(10, 2),
  rate_description    TEXT,
  -- Status
  is_active           BOOLEAN       DEFAULT true,
  is_verified         BOOLEAN       DEFAULT false,
  -- Stripe
  stripe_account_id   VARCHAR(255),   -- Stripe Connect account ID
  stripe_customer_id  VARCHAR(255),
  stripe_connect_status TEXT          DEFAULT 'not_connected'
                        CHECK (stripe_connect_status IN ('not_connected','pending','active')),
  -- Profile
  profile_image_url   TEXT,
  cover_image_url     TEXT,
  -- Timestamps
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add stripe_connect_status if table already existed without it
ALTER TABLE vendor_accounts
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';


-- ----------------------------------------------------------------
-- 3. vendor_bookings
-- ----------------------------------------------------------------
-- Keep CREATE TABLE minimal (no FK constraints that could fail on re-run)
-- All optional/FK columns are added individually below via ALTER TABLE
CREATE TABLE IF NOT EXISTS vendor_bookings (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_account_id UUID    NOT NULL,
  booked_by_user_id UUID    NOT NULL,
  status            VARCHAR(50) DEFAULT 'pending',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add every additional column independently (each is safe to re-run)
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS owner_account_id         UUID;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS client_user_id           UUID;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS event_id                 UUID;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS event_name               VARCHAR(255);
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS event_date               DATE;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS start_time               TIME;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS end_time                 TIME;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS venue_name               VARCHAR(255);
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS venue_address            TEXT;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS notes                    TEXT;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS agreed_amount            DECIMAL(10, 2);
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS deposit_amount           DECIMAL(10, 2);
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS deposit_paid             BOOLEAN DEFAULT false;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS deposit_paid_at          TIMESTAMP WITH TIME ZONE;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS total_paid               DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS payment_status           VARCHAR(50) DEFAULT 'unpaid';
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);


-- ----------------------------------------------------------------
-- 4. vendor_reviews
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_reviews (
  id                  UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_account_id   UUID      NOT NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
  reviewer_user_id    UUID      NOT NULL REFERENCES auth.users(id),
  vendor_booking_id   UUID      REFERENCES vendor_bookings(id) ON DELETE SET NULL,
  rating              INTEGER   NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text         TEXT,
  is_public           BOOLEAN   DEFAULT true,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- 5. vendor_gallery  (portfolio images)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_gallery (
  id                  UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_account_id   UUID      NOT NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
  image_url           TEXT      NOT NULL,
  caption             TEXT,
  display_order       INTEGER   DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- 6. Stripe Connect columns on owner_accounts
-- ----------------------------------------------------------------
ALTER TABLE owner_accounts
  ADD COLUMN IF NOT EXISTS stripe_connect_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';
  -- values: not_connected | pending | active


-- ----------------------------------------------------------------
-- 7. payments  (client→owner and owner→vendor ledger)
-- ----------------------------------------------------------------
-- Keep CREATE TABLE minimal — table may pre-exist from TypeORM without all columns
CREATE TABLE IF NOT EXISTS payments (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS type                      TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_cents              INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee_cents                 INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_fee_cents          INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_cents                 INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id  TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_transfer_id        TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status                    TEXT DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS owner_id                  UUID;  -- direct ref to auth.users
ALTER TABLE payments ADD COLUMN IF NOT EXISTS owner_account_id          UUID;  -- ref to owner_accounts
ALTER TABLE payments ADD COLUMN IF NOT EXISTS vendor_account_id         UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS vendor_booking_id         UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS booking_id                UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS description               TEXT;


-- ----------------------------------------------------------------
-- 8. Venue geo/public columns  (needed for venue directory)
-- ----------------------------------------------------------------
ALTER TABLE venues ADD COLUMN IF NOT EXISTS latitude          DECIMAL(10, 8);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS longitude         DECIMAL(11, 8);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS zip_code          VARCHAR(20);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS city              VARCHAR(100);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS state             VARCHAR(100);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS website           VARCHAR(500);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_public         BOOLEAN DEFAULT false;


-- ----------------------------------------------------------------
-- 9. Indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_category    ON vendor_accounts(category);
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_zip         ON vendor_accounts(zip_code);
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_active      ON vendor_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_location    ON vendor_accounts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_vendor_bookings_vendor      ON vendor_bookings(vendor_account_id);
-- owner_account_id is added via ALTER TABLE above; guard against timing edge cases
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_bookings' AND column_name = 'owner_account_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vendor_bookings_owner ON vendor_bookings(owner_account_id)';
  END IF;
END $$;
-- event_date index
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_bookings' AND column_name = 'event_date'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vendor_bookings_event_date ON vendor_bookings(event_date)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor       ON vendor_reviews(vendor_account_id);
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'owner_account_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments(owner_account_id)';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'vendor_account_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_vendor ON payments(vendor_account_id)';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)';
  END IF;
END $$;


-- ----------------------------------------------------------------
-- 10. Row Level Security — vendor_accounts
-- ----------------------------------------------------------------
ALTER TABLE vendor_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active vendors"    ON vendor_accounts;
DROP POLICY IF EXISTS "Vendors can manage own account"   ON vendor_accounts;

CREATE POLICY "Public can view active vendors"
  ON vendor_accounts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Vendors can manage own account"
  ON vendor_accounts FOR ALL
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- 11. Row Level Security — vendor_bookings
-- ----------------------------------------------------------------
ALTER TABLE vendor_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors can view own bookings"      ON vendor_bookings;
DROP POLICY IF EXISTS "Bookers can view own bookings"      ON vendor_bookings;
DROP POLICY IF EXISTS "Authenticated can create bookings"  ON vendor_bookings;
DROP POLICY IF EXISTS "Vendors can update booking status"  ON vendor_bookings;

CREATE POLICY "Vendors can view own bookings"
  ON vendor_bookings FOR SELECT
  USING (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Bookers can view own bookings"
  ON vendor_bookings FOR SELECT
  USING (booked_by_user_id = auth.uid());

CREATE POLICY "Authenticated can create bookings"
  ON vendor_bookings FOR INSERT
  WITH CHECK (auth.uid() = booked_by_user_id);

CREATE POLICY "Vendors can update booking status"
  ON vendor_bookings FOR UPDATE
  USING (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------
-- 12. Row Level Security — vendor_reviews
-- ----------------------------------------------------------------
ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view public reviews"  ON vendor_reviews;
DROP POLICY IF EXISTS "Users can create reviews"        ON vendor_reviews;
DROP POLICY IF EXISTS "Users can update own reviews"    ON vendor_reviews;

CREATE POLICY "Public can view public reviews"
  ON vendor_reviews FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create reviews"
  ON vendor_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_user_id);

CREATE POLICY "Users can update own reviews"
  ON vendor_reviews FOR UPDATE
  USING (auth.uid() = reviewer_user_id);


-- ----------------------------------------------------------------
-- 13. Row Level Security — vendor_gallery
-- ----------------------------------------------------------------
ALTER TABLE vendor_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view gallery"         ON vendor_gallery;
DROP POLICY IF EXISTS "Vendors can manage own gallery"  ON vendor_gallery;

CREATE POLICY "Public can view gallery"
  ON vendor_gallery FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage own gallery"
  ON vendor_gallery FOR ALL
  USING (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------
-- 14. Row Level Security — payments
-- ----------------------------------------------------------------
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own payments"  ON payments;
DROP POLICY IF EXISTS "Service role full access"      ON payments;

CREATE POLICY "Owners can view own payments"
  ON payments FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Service role full access"
  ON payments FOR ALL
  USING (auth.role() = 'service_role');


-- ----------------------------------------------------------------
-- 15. Geo search functions
-- ----------------------------------------------------------------

-- Vendor search by location (haversine)
CREATE OR REPLACE FUNCTION search_vendors_by_location(
  search_lat     DECIMAL,
  search_lng     DECIMAL,
  radius_miles   INTEGER  DEFAULT 30,
  filter_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id                UUID,
  business_name     VARCHAR,
  category          VARCHAR,
  bio               TEXT,
  city              VARCHAR,
  state             VARCHAR,
  zip_code          VARCHAR,
  latitude          DECIMAL,
  longitude         DECIMAL,
  hourly_rate       DECIMAL,
  flat_rate         DECIMAL,
  rate_description  TEXT,
  profile_image_url TEXT,
  cover_image_url   TEXT,
  website           VARCHAR,
  instagram         VARCHAR,
  phone             VARCHAR,
  email             VARCHAR,
  is_verified       BOOLEAN,
  distance_miles    DECIMAL,
  avg_rating        DECIMAL,
  review_count      BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    va.id,
    va.business_name,
    va.category,
    va.bio,
    va.city,
    va.state,
    va.zip_code,
    va.latitude,
    va.longitude,
    va.hourly_rate,
    va.flat_rate,
    va.rate_description,
    va.profile_image_url,
    va.cover_image_url,
    va.website,
    va.instagram,
    va.phone,
    va.email,
    va.is_verified,
    ROUND(
      (3958.8 * acos(
        LEAST(1.0,
          cos(radians(search_lat)) * cos(radians(va.latitude)) *
          cos(radians(va.longitude) - radians(search_lng)) +
          sin(radians(search_lat)) * sin(radians(va.latitude))
        )
      ))::DECIMAL, 1
    ) AS distance_miles,
    ROUND(AVG(vr.rating)::DECIMAL, 1) AS avg_rating,
    COUNT(vr.id) AS review_count
  FROM vendor_accounts va
  LEFT JOIN vendor_reviews vr
    ON va.id = vr.vendor_account_id AND vr.is_public = true
  WHERE va.is_active = true
    AND va.latitude  IS NOT NULL
    AND va.longitude IS NOT NULL
    AND (filter_category IS NULL OR va.category = filter_category)
    AND (3958.8 * acos(
          LEAST(1.0,
            cos(radians(search_lat)) * cos(radians(va.latitude)) *
            cos(radians(va.longitude) - radians(search_lng)) +
            sin(radians(search_lat)) * sin(radians(va.latitude))
          )
        )) <= radius_miles
  GROUP BY va.id
  ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;


-- Venue search by location
CREATE OR REPLACE FUNCTION search_venues_by_location(
  search_lat    DECIMAL,
  search_lng    DECIMAL,
  radius_miles  INTEGER DEFAULT 30
)
RETURNS TABLE (
  id                UUID,
  name              VARCHAR,
  address           TEXT,
  city              VARCHAR,
  state             VARCHAR,
  zip_code          VARCHAR,
  capacity          INTEGER,
  latitude          DECIMAL,
  longitude         DECIMAL,
  description       TEXT,
  profile_image_url TEXT,
  website           VARCHAR,
  distance_miles    DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    v.address,
    v.city,
    v.state,
    v.zip_code,
    v.capacity,
    v.latitude,
    v.longitude,
    v.description,
    v.profile_image_url,
    v.website,
    ROUND(
      (3958.8 * acos(
        LEAST(1.0,
          cos(radians(search_lat)) * cos(radians(v.latitude)) *
          cos(radians(v.longitude) - radians(search_lng)) +
          sin(radians(search_lat)) * sin(radians(v.latitude))
        )
      ))::DECIMAL, 1
    ) AS distance_miles
  FROM venues v
  WHERE v.is_public = true
    AND v.latitude  IS NOT NULL
    AND v.longitude IS NOT NULL
    AND (3958.8 * acos(
          LEAST(1.0,
            cos(radians(search_lat)) * cos(radians(v.latitude)) *
            cos(radians(v.longitude) - radians(search_lng)) +
            sin(radians(search_lat)) * sin(radians(v.latitude))
          )
        )) <= radius_miles
  ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------
-- Done.  Verify:
--   SELECT enumlabel FROM pg_enum
--   WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');
-- ----------------------------------------------------------------
