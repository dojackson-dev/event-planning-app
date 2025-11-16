-- Event Planning App - Supabase Database Schema
-- This migration creates all tables, enums, and relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('customer', 'owner', 'planner');
CREATE TYPE event_status AS ENUM ('draft', 'scheduled', 'completed');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');
CREATE TYPE contract_status AS ENUM ('draft', 'sent', 'signed', 'cancelled');
CREATE TYPE insurance_status AS ENUM ('not_required', 'requested', 'received', 'verified', 'expired');
CREATE TYPE client_status AS ENUM ('contacted_by_phone', 'walkthrough_completed', 'booked', 'deposit_paid', 'completed', 'cancelled');
CREATE TYPE item_type AS ENUM ('setup', 'catering', 'entertainment');
CREATE TYPE bar_option AS ENUM ('none', 'open', 'cash', 'limited');
CREATE TYPE music_type AS ENUM ('dj', 'band', 'mc', 'none');
CREATE TYPE event_type AS ENUM (
  'wedding_reception',
  'birthday_party',
  'retirement',
  'anniversary',
  'baby_shower',
  'corporate_event',
  'fundraiser_gala',
  'concert_show',
  'conference_meeting',
  'workshop',
  'quinceanera',
  'sweet_16',
  'prom_formal',
  'family_reunion',
  'memorial_service',
  'product_launch',
  'holiday_party',
  'engagement_party',
  'graduation_party'
);

-- ============================================
-- TENANTS TABLE
-- ============================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID,
  subscription_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role DEFAULT 'customer',
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add owner_id FK to tenants after users table exists
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_owner 
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- EVENTS TABLE
-- ============================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  day_of_week VARCHAR(20),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  setup_time TIME,
  venue VARCHAR(255),
  max_guests INTEGER,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status event_status DEFAULT 'draft',
  event_type event_type NOT NULL,
  -- Services
  caterer VARCHAR(255),
  decorator VARCHAR(255),
  balloon_decorator VARCHAR(255),
  marquee VARCHAR(255),
  music_type music_type,
  bar_option bar_option DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ITEMS TABLE
-- ============================================

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type item_type NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTRACTS TABLE
-- ============================================

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status contract_status DEFAULT 'draft',
  document_upload TEXT,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSURANCE TABLE
-- ============================================

CREATE TABLE insurance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status insurance_status DEFAULT 'not_required',
  provider VARCHAR(255),
  policy_number VARCHAR(100),
  certificate_upload TEXT,
  verified_at TIMESTAMPTZ,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOOR LISTS TABLE
-- ============================================

CREATE TABLE door_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostess VARCHAR(255),
  upload TEXT,
  deadline TIMESTAMPTZ,
  vip_notes TEXT,
  parking_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'pending',
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  deposit DECIMAL(10, 2) DEFAULT 0,
  payment_status payment_status DEFAULT 'pending',
  client_status client_status DEFAULT 'contacted_by_phone',
  total_amount_paid DECIMAL(10, 2) DEFAULT 0,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  insurance_id UUID REFERENCES insurance(id) ON DELETE SET NULL,
  door_list_id UUID REFERENCES door_lists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOOKING ITEMS TABLE (Junction)
-- ============================================

CREATE TABLE booking_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  custom_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status payment_status DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REMINDERS TABLE
-- ============================================

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('email', 'sms')),
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECURITY ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE security_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  arrival_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTAKE FORMS TABLE
-- ============================================

CREATE TABLE intake_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  -- Client Info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  preferred_contact VARCHAR(20),
  referral_source VARCHAR(100),
  -- Event Details
  event_type event_type NOT NULL,
  event_name VARCHAR(255),
  event_date DATE,
  alternate_date DATE,
  start_time TIME,
  end_time TIME,
  estimated_guests INTEGER,
  confirmed_guests INTEGER,
  guest_age_range JSONB,
  vip_guests TEXT,
  indoor_outdoor VARCHAR(20),
  setup_style VARCHAR(100),
  needs_dance_floor BOOLEAN DEFAULT false,
  needs_stage BOOLEAN DEFAULT false,
  -- Services
  needs_catering BOOLEAN DEFAULT false,
  catering_style VARCHAR(50),
  dietary_restrictions TEXT,
  needs_decorator BOOLEAN DEFAULT false,
  color_theme VARCHAR(100),
  decor_style VARCHAR(100),
  needs_balloons BOOLEAN DEFAULT false,
  needs_marquee BOOLEAN DEFAULT false,
  music_type music_type,
  needs_photographer BOOLEAN DEFAULT false,
  needs_videographer BOOLEAN DEFAULT false,
  bar_option bar_option DEFAULT 'none',
  beer_wine_only BOOLEAN DEFAULT false,
  needs_security BOOLEAN DEFAULT false,
  security_count INTEGER,
  needs_parking BOOLEAN DEFAULT false,
  parking_spaces INTEGER,
  needs_valet BOOLEAN DEFAULT false,
  -- Budget
  estimated_budget VARCHAR(50),
  budget_flexibility VARCHAR(50),
  payment_preference VARCHAR(50),
  special_requests TEXT,
  allergies TEXT,
  accessibility TEXT,
  -- Walkthrough
  walkthrough_requested BOOLEAN DEFAULT false,
  preferred_walkthrough_date DATE,
  preferred_walkthrough_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_messages_booking ON messages(booking_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_items_tenant ON items(tenant_id);
CREATE INDEX idx_intake_forms_tenant ON intake_forms(tenant_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE door_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;

-- Tenants: Users can only access their own tenant
CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Users: Can view users in same tenant
CREATE POLICY "Users can view users in same tenant" ON users
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Events: Tenant-scoped access
CREATE POLICY "Users can view events in their tenant" ON events
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owners can manage events in their tenant" ON events
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'planner')
    )
  );

-- Bookings: Users can view their own bookings or all if owner/planner
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'planner')
      AND tenant_id IN (SELECT tenant_id FROM events WHERE id = bookings.event_id)
    )
  );

-- Items: Tenant-scoped
CREATE POLICY "Users can view items in their tenant" ON items
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Messages: Users can view messages for their bookings
CREATE POLICY "Users can view their booking messages" ON messages
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'planner')
    )
  );

-- Payments: Users can view their own payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'planner')
    )
  );

-- Intake Forms: Tenant-scoped
CREATE POLICY "Owners can view intake forms in their tenant" ON intake_forms
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'planner')
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_updated_at BEFORE UPDATE ON insurance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_door_lists_updated_at BEFORE UPDATE ON door_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_assignments_updated_at BEFORE UPDATE ON security_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intake_forms_updated_at BEFORE UPDATE ON intake_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-set day_of_week on events
CREATE OR REPLACE FUNCTION set_day_of_week()
RETURNS TRIGGER AS $$
BEGIN
  NEW.day_of_week = TO_CHAR(NEW.date, 'Day');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_events_day_of_week BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_day_of_week();

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Insert a demo tenant
INSERT INTO tenants (id, name, subdomain, subscription_status)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Demo Event Center', 'demo', 'active');

-- Note: Users will be created through Supabase Auth signup
-- The trigger will link them to the users table
