-- ================================================================
-- AUCTION CENTER — organization pages, item donations (Auction Org Pages)
-- ================================================================
-- One organization profile per promoter account that hosts many auctions
-- (story, cover, goal, gallery, sponsors), public auction slugs, and an
-- item-donation intake that runs before bidding opens.
--
-- Run AFTER create-auctions.sql, create-auction-functions.sql and the two
-- *-additions.sql files. Safe to run multiple times (IF NOT EXISTS / guarded
-- DO blocks). Backend-only access via the service role: RLS is enabled on
-- every new table with NO policies, so anon/authenticated clients can read
-- or write nothing directly.
-- ================================================================

-- ----------------------------------------------------------------
-- Organization profile (ONE per promoter account)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_organizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_account_id   UUID NOT NULL UNIQUE REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  slug                  TEXT NOT NULL UNIQUE
                          CHECK (char_length(slug) BETWEEN 3 AND 60 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                  TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  tagline               TEXT CHECK (tagline IS NULL OR char_length(tagline) <= 300),
  logo_url              TEXT,
  cover_image_url       TEXT,
  story                 TEXT CHECK (story IS NULL OR char_length(story) <= 10000),
  beneficiaries         TEXT CHECK (beneficiaries IS NULL OR char_length(beneficiaries) <= 2000),
  goal_cents            INTEGER CHECK (goal_cents IS NULL OR goal_cents >= 0),
  impact_examples       JSONB NOT NULL DEFAULT '[]'::jsonb,
  website_url           TEXT,
  contact_email         TEXT,
  ein                   TEXT,
  social                JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published          BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auction_org_gallery (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES auction_organizations(id) ON DELETE CASCADE,
  image_url        TEXT NOT NULL,
  caption          TEXT CHECK (caption IS NULL OR char_length(caption) <= 300),
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_org_gallery_org
  ON auction_org_gallery (organization_id, sort_order);

-- Only rows with permission_confirmed = true are ever returned publicly.
CREATE TABLE IF NOT EXISTS auction_org_sponsors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES auction_organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  logo_url              TEXT,
  website_url           TEXT,
  tier                  TEXT CHECK (tier IS NULL OR char_length(tier) <= 60),
  sort_order            INTEGER NOT NULL DEFAULT 0,
  permission_confirmed  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_org_sponsors_org
  ON auction_org_sponsors (organization_id, sort_order);

-- ----------------------------------------------------------------
-- auctions: organization link, public slug, cover, donation intake window
-- ----------------------------------------------------------------
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES auction_organizations(id) ON DELETE SET NULL;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS accepts_donations BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS donations_close_at TIMESTAMPTZ;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS page_published BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auctions_slug_format_chk') THEN
    ALTER TABLE auctions ADD CONSTRAINT auctions_slug_format_chk
      CHECK (slug IS NULL OR (char_length(slug) BETWEEN 3 AND 60 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auctions_org_slug
  ON auctions (organization_id, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auctions_organization ON auctions (organization_id);

-- ----------------------------------------------------------------
-- auction_items: richer item details + donor attribution
-- ----------------------------------------------------------------
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS specifications TEXT;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS whats_included TEXT;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS restrictions TEXT;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS expires_on DATE;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS fulfillment_method TEXT;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS fulfillment_details TEXT;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS is_experience BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS scheduling_requirements TEXT;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS blackout_dates TEXT;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS donor_business TEXT;
-- Existing items keep showing their donor name; new donor-submitted items default to the donor's choice.
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS donor_recognition BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE auction_items ADD COLUMN IF NOT EXISTS source_donation_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_items_fulfillment_method_chk') THEN
    ALTER TABLE auction_items ADD CONSTRAINT auction_items_fulfillment_method_chk
      CHECK (fulfillment_method IS NULL
             OR fulfillment_method IN ('pickup', 'delivery', 'shipping', 'digital', 'arranged_with_donor'));
  END IF;
END $$;

-- ----------------------------------------------------------------
-- Item donations (submitted publicly by SMS-verified donors, reviewed by the organizer)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_donations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id               UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  organization_id          UUID REFERENCES auction_organizations(id) ON DELETE SET NULL,

  donor_name               TEXT NOT NULL CHECK (char_length(donor_name) BETWEEN 1 AND 200),
  donor_business           TEXT CHECK (donor_business IS NULL OR char_length(donor_business) <= 200),
  donor_email              TEXT NOT NULL CHECK (char_length(donor_email) <= 254),
  donor_phone              TEXT NOT NULL CHECK (donor_phone ~ '^\+[1-9][0-9]{6,14}$'),
  phone_verified_at        TIMESTAMPTZ,

  title                    TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description              TEXT CHECK (description IS NULL OR char_length(description) <= 5000),
  category                 TEXT CHECK (category IS NULL OR char_length(category) <= 100),
  estimated_value_cents    INTEGER CHECK (estimated_value_cents IS NULL OR estimated_value_cents >= 0),
  image_urls               TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(image_urls) <= 6),

  condition                TEXT,
  specifications           TEXT,
  whats_included           TEXT,
  restrictions             TEXT,
  expires_on               DATE,
  fulfillment_method       TEXT CHECK (fulfillment_method IS NULL
                             OR fulfillment_method IN ('pickup', 'delivery', 'shipping', 'digital', 'arranged_with_donor')),
  fulfillment_details      TEXT,
  is_experience            BOOLEAN NOT NULL DEFAULT false,
  scheduling_requirements  TEXT,
  blackout_dates           TEXT,

  recognition_ok           BOOLEAN NOT NULL DEFAULT false,

  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  decline_reason           TEXT,
  reviewed_by_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at              TIMESTAMPTZ,
  item_id                  UUID REFERENCES auction_items(id) ON DELETE SET NULL,

  -- HMAC of the submitter IP (never the raw address) for per-IP limits
  ip_hash                  TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_donations_auction_status
  ON auction_donations (auction_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_donations_phone
  ON auction_donations (auction_id, donor_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_donations_ip
  ON auction_donations (ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_items_source_donation_fk') THEN
    ALTER TABLE auction_items ADD CONSTRAINT auction_items_source_donation_fk
      FOREIGN KEY (source_donation_id) REFERENCES auction_donations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auction_items_source_donation
  ON auction_items (source_donation_id) WHERE source_donation_id IS NOT NULL;

-- ----------------------------------------------------------------
-- One-time SMS codes for donor verification (store hashes only)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_donor_otps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id   UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  phone        TEXT NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{6,14}$'),
  code_hash    TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  ip_hash      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_donor_otps_phone_created
  ON auction_donor_otps (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_donor_otps_ip_created
  ON auction_donor_otps (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_donor_otps_auction_phone
  ON auction_donor_otps (auction_id, phone, created_at DESC);

-- Backend-only (service role); no policies means no direct client access.
ALTER TABLE auction_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_org_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_org_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_donor_otps ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
