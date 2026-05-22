-- ============================================================
-- VIP Concierge Suite
-- Run in Supabase SQL Editor
-- ============================================================

-- VIP Sections (named areas within an event: "Section A", "Balcony", etc.)
CREATE TABLE IF NOT EXISTS vip_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- "Section A", "Front Row", "Balcony VIP"
  description TEXT,
  capacity INT NOT NULL DEFAULT 1,
  display_order INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available'   -- available | reserved | unavailable
    CHECK (status IN ('available', 'reserved', 'unavailable')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIP Packages (the sellable product)
CREATE TABLE IF NOT EXISTS vip_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  section_id UUID REFERENCES vip_sections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,                        -- "Platinum Table", "Gold Booth"
  package_type TEXT NOT NULL DEFAULT 'table' -- table | booth | section | seat | cabana | meet_greet | custom
    CHECK (package_type IN ('table','booth','section','seat','sponsor_table','cabana','meet_greet','lounge','private_room','custom')),
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,           -- max people in this package
  included_tickets INT NOT NULL DEFAULT 0,   -- admission passes generated on purchase
  table_label TEXT,                          -- "Table 7", "T4"
  inventory INT NOT NULL DEFAULT 1,          -- how many of this package can be sold
  inventory_sold INT NOT NULL DEFAULT 0,
  requires_concierge BOOLEAN NOT NULL DEFAULT FALSE,
  guest_names_required BOOLEAN NOT NULL DEFAULT FALSE,
  guests_arrive_separately BOOLEAN NOT NULL DEFAULT FALSE,
  service_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold_out', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIP Orders (a buyer's VIP purchase)
CREATE TABLE IF NOT EXISTS vip_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  vip_package_id UUID NOT NULL REFERENCES vip_packages(id) ON DELETE RESTRICT,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_name TEXT,
  total_price NUMERIC(10,2) NOT NULL,
  stripe_checkout_session_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  check_in_status TEXT NOT NULL DEFAULT 'not_arrived'
    CHECK (check_in_status IN ('not_arrived', 'partial', 'checked_in')),
  guests_checked_in INT NOT NULL DEFAULT 0,
  concierge_user_id UUID,
  notes TEXT,
  qr_code TEXT UNIQUE,                       -- master QR for the order
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIP Guest Passes (individual admission credentials for a VIP order)
CREATE TABLE IF NOT EXISTS vip_guest_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_order_id UUID NOT NULL REFERENCES vip_orders(id) ON DELETE CASCADE,
  guest_name TEXT,
  guest_email TEXT,
  qr_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'used', 'cancelled')),
  checked_in_at TIMESTAMPTZ,
  checked_in_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Items (add-ons available for a given event)
CREATE TABLE IF NOT EXISTS vip_service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- "Moët Bottle", "Birthday Package"
  category TEXT NOT NULL DEFAULT 'other'     -- bar | kitchen | concierge | security | other
    CHECK (category IN ('bar','kitchen','concierge','security','other')),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  inventory INT,                             -- NULL = unlimited
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'unavailable')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIP Service Orders (add-ons purchased/requested with a VIP order)
CREATE TABLE IF NOT EXISTS vip_service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_order_id UUID NOT NULL REFERENCES vip_orders(id) ON DELETE CASCADE,
  service_item_id UUID NOT NULL REFERENCES vip_service_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ordered'
    CHECK (status IN ('ordered','confirmed','preparing','delivered','cancelled','refunded')),
  assigned_to TEXT,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layout uploads (seating charts / floor plans)
CREATE TABLE IF NOT EXISTS vip_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID REFERENCES public_events(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',  -- image | pdf
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_vip_packages_event ON vip_packages(public_event_id);
CREATE INDEX IF NOT EXISTS idx_vip_orders_event ON vip_orders(public_event_id);
CREATE INDEX IF NOT EXISTS idx_vip_orders_session ON vip_orders(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_vip_guest_passes_order ON vip_guest_passes(vip_order_id);
CREATE INDEX IF NOT EXISTS idx_vip_service_orders_order ON vip_service_orders(vip_order_id);
