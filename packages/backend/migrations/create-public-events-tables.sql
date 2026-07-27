-- ================================================================
-- CREATE PUBLIC EVENTS AND TICKET SYSTEMS
-- ================================================================
-- This migration creates the tables needed for promoters to list
-- and sell tickets to public events.
-- ================================================================

-- Create enum for event status
DO $$
BEGIN
  CREATE TYPE event_status_type AS ENUM ('draft', 'published', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ================================================================
-- public_events TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS public_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Promoter relationship
  promoter_account_id UUID NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  
  -- Event information
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  -- Venue information
  venue_name VARCHAR(255),
  venue_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  
  -- Event details
  category VARCHAR(100),
  image_url TEXT,
  age_restriction VARCHAR(100),
  
  -- Status and tracking
  status event_status_type DEFAULT 'draft',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for public_events
CREATE INDEX IF NOT EXISTS idx_public_events_promoter_account_id ON public_events(promoter_account_id);
CREATE INDEX IF NOT EXISTS idx_public_events_event_date ON public_events(event_date);
CREATE INDEX IF NOT EXISTS idx_public_events_status ON public_events(status);
CREATE INDEX IF NOT EXISTS idx_public_events_city ON public_events(city);
CREATE INDEX IF NOT EXISTS idx_public_events_category ON public_events(category);
CREATE INDEX IF NOT EXISTS idx_public_events_status_date ON public_events(status, event_date DESC);

-- ================================================================
-- ticket_tiers TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationship to public events
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  
  -- Tier information
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ticket_tiers
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_public_event_id ON ticket_tiers(public_event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_price ON ticket_tiers(price);

-- ================================================================
-- tickets TABLE (for tracking individual ticket purchases)
-- ================================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  ticket_tier_id UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
  
  -- Buyer information
  buyer_email VARCHAR(255),
  
  -- Payment information
  stripe_checkout_session_id VARCHAR(255),
  amount_paid DECIMAL(10, 2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'valid',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_public_event_id ON tickets(public_event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_tier_id ON tickets(ticket_tier_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_email ON tickets(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_session_id ON tickets(stripe_checkout_session_id);

-- ================================================================
-- RLS (Row Level Security) Policies
-- ================================================================

-- Enable RLS on public_events
ALTER TABLE public_events ENABLE ROW LEVEL SECURITY;

-- Allow promoters to see their own events
CREATE POLICY "Promoters can view their own events" ON public_events
  FOR SELECT
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

-- Allow promoters to create events
CREATE POLICY "Promoters can create events" ON public_events
  FOR INSERT
  WITH CHECK (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

-- Allow promoters to update their own events
CREATE POLICY "Promoters can update their own events" ON public_events
  FOR UPDATE
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

-- Allow promoters to delete their own events
CREATE POLICY "Promoters can delete their own events" ON public_events
  FOR DELETE
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

-- Allow anyone to view PUBLISHED events
CREATE POLICY "Anyone can view published events" ON public_events
  FOR SELECT
  USING (status = 'published');

-- Enable RLS on ticket_tiers
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;

-- Allow promoters to manage ticket tiers for their events
CREATE POLICY "Promoters can manage their event's ticket tiers" ON ticket_tiers
  FOR ALL
  USING (
    public_event_id IN (
      SELECT id FROM public_events 
      WHERE promoter_account_id IN (
        SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
      )
    )
  );

-- Allow anyone to view ticket tiers for published events
CREATE POLICY "Anyone can view ticket tiers for published events" ON ticket_tiers
  FOR SELECT
  USING (
    public_event_id IN (
      SELECT id FROM public_events WHERE status = 'published'
    )
  );

-- Enable RLS on tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Allow promoters to view tickets for their events
CREATE POLICY "Promoters can view tickets for their events" ON tickets
  FOR SELECT
  USING (
    public_event_id IN (
      SELECT id FROM public_events 
      WHERE promoter_account_id IN (
        SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
      )
    )
  );

-- Allow creating ticket records (for Stripe webhook processing)
CREATE POLICY "Tickets can be created for checkout sessions" ON tickets
  FOR INSERT
  WITH CHECK (true);

-- ================================================================
-- COMPLETION
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE 'Created public_events, ticket_tiers, and tickets tables with RLS policies';
END $$;
