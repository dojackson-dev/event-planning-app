-- ================================================================
-- CREATE PUBLIC EVENTS AND TICKET SYSTEMS - PART 1
-- ================================================================
-- RUN THIS FIRST
-- Then run public-events-migration-part2.sql after this completes

-- Create enum for event status
DO $$
BEGIN
  CREATE TYPE event_status_type AS ENUM ('draft', 'published', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- public_events TABLE
CREATE TABLE IF NOT EXISTS public_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_account_id UUID NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  venue_name VARCHAR(255),
  venue_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  category VARCHAR(100),
  image_url TEXT,
  age_restriction VARCHAR(100),
  status event_status_type DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_events_promoter_account_id ON public_events(promoter_account_id);
CREATE INDEX IF NOT EXISTS idx_public_events_event_date ON public_events(event_date);
CREATE INDEX IF NOT EXISTS idx_public_events_status ON public_events(status);
CREATE INDEX IF NOT EXISTS idx_public_events_category ON public_events(category);
CREATE INDEX IF NOT EXISTS idx_public_events_status_date ON public_events(status, event_date DESC);

-- ticket_tiers TABLE
CREATE TABLE IF NOT EXISTS ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_tiers_public_event_id ON ticket_tiers(public_event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_price ON ticket_tiers(price);

-- tickets TABLE
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  ticket_tier_id UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
  buyer_email VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  amount_paid DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'valid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_public_event_id ON tickets(public_event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_tier_id ON tickets(ticket_tier_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_email ON tickets(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_session_id ON tickets(stripe_checkout_session_id);

-- ================================================================
-- SUCCESS: Tables created!
-- ================================================================
-- After running this successfully, run public-events-migration-part2.sql
-- to enable RLS and create security policies.
