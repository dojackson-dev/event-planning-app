-- Auth Architecture Migration
-- Creates tables and columns for Owner/Client/Admin authentication system
-- Supports: Email/SMS verification, Stripe subscriptions, client invites, venues

-- ============================================================================
-- STEP 1: Add columns to existing users table
-- ============================================================================

-- Add verification and status columns if they don't exist
DO $$ 
BEGIN
  -- Email verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'email_verified') THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;

  -- Phone verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'phone_number') THEN
    ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'phone_verified') THEN
    ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;

  -- SMS opt-in tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'sms_opt_in') THEN
    ALTER TABLE users ADD COLUMN sms_opt_in BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'sms_opt_in_date') THEN
    ALTER TABLE users ADD COLUMN sms_opt_in_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'sms_opt_in_ip') THEN
    ALTER TABLE users ADD COLUMN sms_opt_in_ip VARCHAR(45);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'sms_opt_in_user_agent') THEN
    ALTER TABLE users ADD COLUMN sms_opt_in_user_agent TEXT;
  END IF;

  -- Account status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN users.email_verified IS 'Email verification status';
COMMENT ON COLUMN users.phone_number IS 'Phone number for SMS verification';
COMMENT ON COLUMN users.phone_verified IS 'Phone verification status';
COMMENT ON COLUMN users.sms_opt_in IS 'User consent for SMS notifications';
COMMENT ON COLUMN users.sms_opt_in_date IS 'Timestamp of SMS opt-in consent';
COMMENT ON COLUMN users.sms_opt_in_ip IS 'IP address at time of SMS opt-in';
COMMENT ON COLUMN users.sms_opt_in_user_agent IS 'User agent at time of SMS opt-in';
COMMENT ON COLUMN users.status IS 'Account status: active, suspended, pending';

-- ============================================================================
-- STEP 2: Create owner_accounts table (Stripe subscription management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS owner_accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  
  -- Stripe integration
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'inactive', -- inactive, active, past_due, canceled, trialing
  plan_id VARCHAR(100),
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_owner_account UNIQUE(user_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_owner_accounts_user_id ON owner_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_accounts_stripe_customer ON owner_accounts(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_owner_accounts_subscription_status ON owner_accounts(subscription_status);

-- Enable RLS
ALTER TABLE owner_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for owner_accounts
CREATE POLICY "owner_accounts_owner_select" ON owner_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "owner_accounts_owner_update" ON owner_accounts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_accounts_admin_all" ON owner_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

COMMENT ON TABLE owner_accounts IS 'Owner business accounts with Stripe subscription management';

-- ============================================================================
-- STEP 3: Create venues table (owners must have at least one venue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  owner_account_id INTEGER NOT NULL REFERENCES owner_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  capacity INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_venues_owner_account ON venues(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_venues_is_active ON venues(is_active);

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venues
CREATE POLICY "venues_owner_all" ON venues
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM owner_accounts
      WHERE owner_accounts.id = venues.owner_account_id
      AND owner_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "venues_admin_all" ON venues
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Allow clients to view venues they have events at
CREATE POLICY "venues_client_select" ON venues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.venue_id = venues.id
      AND events.client_id = auth.uid()
    )
  );

COMMENT ON TABLE venues IS 'Physical venue locations managed by owners';

-- ============================================================================
-- STEP 4: Create memberships table (link users to owner accounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memberships (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_account_id INTEGER NOT NULL REFERENCES owner_accounts(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, staff
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_owner_membership UNIQUE(user_id, owner_account_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_owner_account_id ON memberships(owner_account_id);

-- Enable RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memberships
CREATE POLICY "memberships_user_select" ON memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "memberships_owner_all" ON memberships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM owner_accounts
      WHERE owner_accounts.id = memberships.owner_account_id
      AND owner_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "memberships_admin_all" ON memberships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

COMMENT ON TABLE memberships IS 'Links users to owner accounts for team management';

-- ============================================================================
-- STEP 5: Create client_profiles table (extended client information)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  preferred_contact_method VARCHAR(50) DEFAULT 'email', -- email, sms, phone
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_client_profile UNIQUE(user_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id ON client_profiles(user_id);

-- Enable RLS
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_profiles
CREATE POLICY "client_profiles_self_select" ON client_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "client_profiles_self_update" ON client_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "client_profiles_owner_select" ON client_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'owner'
    )
  );

CREATE POLICY "client_profiles_admin_all" ON client_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

COMMENT ON TABLE client_profiles IS 'Extended profile information for client users';

-- ============================================================================
-- STEP 6: Create invites table (client invitation system)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invites (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_account_id INTEGER NOT NULL REFERENCES owner_accounts(id) ON DELETE CASCADE,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired, revoked
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES users(id),
  
  metadata JSONB, -- Store additional invite context (event details, etc.)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_invites_owner_account_id ON invites(owner_account_id);

-- Enable RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invites
CREATE POLICY "invites_owner_all" ON invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM owner_accounts
      WHERE owner_accounts.id = invites.owner_account_id
      AND owner_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "invites_admin_all" ON invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Allow anyone to view their own invites by email (for acceptance flow)
CREATE POLICY "invites_public_select_by_token" ON invites
  FOR SELECT
  TO anon, authenticated
  USING (true); -- Application validates token

COMMENT ON TABLE invites IS 'Client invitation tokens with expiry and tracking';

-- ============================================================================
-- STEP 7: Create helper functions
-- ============================================================================

-- Function to check if owner has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM owner_accounts
    WHERE user_id = user_uuid
    AND subscription_status IN ('active', 'trialing')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION has_active_subscription TO authenticated;

COMMENT ON FUNCTION has_active_subscription IS 'Check if a user has an active subscription';

-- Function to get owner account for user
CREATE OR REPLACE FUNCTION get_owner_account(user_uuid UUID)
RETURNS owner_accounts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account owner_accounts;
BEGIN
  SELECT * INTO account FROM owner_accounts WHERE user_id = user_uuid LIMIT 1;
  RETURN account;
END;
$$;

GRANT EXECUTE ON FUNCTION get_owner_account TO authenticated;

COMMENT ON FUNCTION get_owner_account IS 'Retrieve owner account for a user';

-- ============================================================================
-- STEP 8: Update existing tables to link with venues
-- ============================================================================

-- Add venue_id to events table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'events' AND column_name = 'venue_id') THEN
    ALTER TABLE events ADD COLUMN venue_id INTEGER REFERENCES venues(id);
    CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events(venue_id);
  END IF;
END $$;

COMMENT ON COLUMN events.venue_id IS 'Reference to venue where event takes place';

-- ============================================================================
-- STEP 9: Create audit trigger for updated_at columns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'updated_at'
    AND table_name IN ('owner_accounts', 'venues', 'memberships', 'client_profiles', 'invites')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END;
$$;

-- ============================================================================
-- STEP 10: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON owner_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON venues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invites TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE owner_accounts_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE venues_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE memberships_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE client_profiles_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invites_id_seq TO authenticated;

-- Allow anonymous to view invites (for acceptance page)
GRANT SELECT ON invites TO anon;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
  missing_tables TEXT[] := '{}';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'owner_accounts') THEN
    missing_tables := array_append(missing_tables, 'owner_accounts');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
    missing_tables := array_append(missing_tables, 'venues');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memberships') THEN
    missing_tables := array_append(missing_tables, 'memberships');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_profiles') THEN
    missing_tables := array_append(missing_tables, 'client_profiles');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invites') THEN
    missing_tables := array_append(missing_tables, 'invites');
  END IF;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Migration failed. Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'Auth architecture migration completed successfully!';
    RAISE NOTICE 'Tables created: owner_accounts, venues, memberships, client_profiles, invites';
    RAISE NOTICE 'Next step: Run set-owners-subscribed.js to activate existing owner accounts';
  END IF;
END;
$$;
