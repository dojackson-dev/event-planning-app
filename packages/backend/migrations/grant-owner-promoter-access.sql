-- ================================================================
-- GRANT PROMOTER ACCESS TO ALL OWNER ACCOUNTS
-- This migration adds all existing owners to promoter_accounts table
-- Safe to re-run: checks if promoter account already exists
-- ================================================================

-- Add 'promoter' to user_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'promoter'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'promoter';
    RAISE NOTICE 'Added promoter to user_role enum';
  ELSE
    RAISE NOTICE 'promoter already exists in user_role enum';
  END IF;
END $$;

-- Create promoter_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS promoter_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_account_id INTEGER REFERENCES owner_accounts(id) ON DELETE CASCADE,
  
  -- Basic Info
  company_name VARCHAR(255),
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(255),
  bio TEXT,
  website VARCHAR(500),
  instagram VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Stripe Connect
  stripe_account_id VARCHAR(255),
  stripe_connect_status TEXT DEFAULT 'not_connected' 
    CHECK (stripe_connect_status IN ('not_connected', 'pending', 'active')),
  
  -- Profile images
  profile_image_url TEXT,
  cover_image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one promoter account per user
  UNIQUE(user_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_promoter_accounts_user_id ON promoter_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_accounts_owner_account_id ON promoter_accounts(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_promoter_accounts_is_active ON promoter_accounts(is_active);

-- ================================================================
-- INSERT ALL OWNERS INTO PROMOTER_ACCOUNTS
-- ================================================================

-- Insert owners who don't have a promoter account yet
INSERT INTO promoter_accounts (
  user_id,
  owner_account_id,
  company_name,
  contact_name,
  email,
  is_active,
  created_at,
  updated_at
)
SELECT
  u.id,
  oa.id,
  oa.business_name,
  COALESCE(u.first_name || ' ' || u.last_name, u.email) as contact_name,
  u.email,
  true,
  NOW(),
  NOW()
FROM users u
INNER JOIN owner_accounts oa ON oa.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM promoter_accounts pa WHERE pa.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ================================================================
-- UPDATE USERS TABLE TO INCLUDE PROMOTER ROLE
-- ================================================================

-- For users who now have promoter accounts, add 'promoter' to their roles array
UPDATE users
SET 
  roles = CASE
    WHEN NOT roles @> ARRAY['promoter']::text[] THEN array_append(roles, 'promoter')
    ELSE roles
  END
WHERE id IN (
  SELECT DISTINCT user_id FROM promoter_accounts
)
AND NOT (roles @> ARRAY['promoter']::text[]);

-- Log completion
DO $$
DECLARE
  owner_count INTEGER;
  promoter_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO owner_count FROM users WHERE roles @> ARRAY['owner']::text[];
  SELECT COUNT(*) INTO promoter_count FROM promoter_accounts;
  
  RAISE NOTICE 'Promoter access granted. Owners with roles: %, Total promoter accounts: %', owner_count, promoter_count;
END $$;
