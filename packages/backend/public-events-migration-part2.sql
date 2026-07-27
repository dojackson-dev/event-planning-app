-- ================================================================
-- PUBLIC EVENTS AND TICKET SYSTEMS - PART 2: RLS POLICIES
-- ================================================================
-- Run this AFTER public-events-migration.sql completes successfully

-- Enable RLS
ALTER TABLE public_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_events
CREATE POLICY "Promoters can view their own events" ON public_events
  FOR SELECT
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Promoters can create events" ON public_events
  FOR INSERT
  WITH CHECK (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

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

CREATE POLICY "Promoters can delete their own events" ON public_events
  FOR DELETE
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view published events" ON public_events
  FOR SELECT
  USING (status = 'published');

-- RLS Policies for ticket_tiers
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

CREATE POLICY "Anyone can view ticket tiers for published events" ON ticket_tiers
  FOR SELECT
  USING (
    public_event_id IN (
      SELECT id FROM public_events WHERE status = 'published'
    )
  );

-- RLS Policies for tickets
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

CREATE POLICY "Tickets can be created for checkout sessions" ON tickets
  FOR INSERT
  WITH CHECK (true);

-- ================================================================
-- COMPLETE: RLS policies enabled
-- ================================================================
-- Now you can create and manage promoter events!
