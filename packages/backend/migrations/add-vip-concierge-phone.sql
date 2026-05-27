-- Migration: Create vip_concierges table for phone-based concierge access
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

-- Concierges are assigned per-event by the promoter (name + phone).
-- A unique access_code is generated and shared with the concierge.
-- The code grants access to a public portal showing that event's VIP orders.
-- When any VIP ticket for the event is scanned, all assigned concierges
-- receive an SMS with the guest's arrival details and package info.

CREATE TABLE IF NOT EXISTS vip_concierges (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id  UUID        NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  access_code      TEXT        NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vip_concierges_event ON vip_concierges(public_event_id);
CREATE INDEX IF NOT EXISTS idx_vip_concierges_code  ON vip_concierges(access_code);

-- RLS: promoters can manage their own concierges
ALTER TABLE vip_concierges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vip_concierges'
      AND policyname = 'Promoters manage their event concierges'
  ) THEN
    CREATE POLICY "Promoters manage their event concierges"
      ON vip_concierges
      USING (
        public_event_id IN (
          SELECT id FROM public_events
          WHERE promoter_account_id IN (
            SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;
