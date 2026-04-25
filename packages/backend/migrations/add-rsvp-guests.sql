-- Migration: RSVP system (per-guest invite links with phone verification)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rsvp_guests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_form_id   UUID REFERENCES intake_forms(id) ON DELETE CASCADE,
  owner_id         UUID NOT NULL,          -- venue owner (intake_form.user_id)
  guest_name       TEXT NOT NULL,
  guest_phone      TEXT,                   -- for link verification (last 4 match)
  guest_email      TEXT,
  rsvp_token       UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status           TEXT DEFAULT 'pending', -- pending | attending | declined
  plus_ones        INTEGER DEFAULT 0,
  meal_preference  TEXT DEFAULT 'standard', -- standard | vegetarian | vegan | gluten_free | kosher
  table_assignment TEXT,                   -- set by client/owner, read-only for guest
  responded_at     TIMESTAMPTZ,
  sms_sent_at      TIMESTAMPTZ,
  email_sent_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_guests_intake_form_id ON rsvp_guests(intake_form_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_guests_rsvp_token     ON rsvp_guests(rsvp_token);
CREATE INDEX IF NOT EXISTS idx_rsvp_guests_owner_id       ON rsvp_guests(owner_id);

-- RLS: owners can read/write their own guests
ALTER TABLE rsvp_guests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rsvp_guests' AND policyname = 'Owners manage their RSVP guests'
  ) THEN
    CREATE POLICY "Owners manage their RSVP guests"
      ON rsvp_guests FOR ALL
      USING (owner_id = auth.uid());
  END IF;
END $$;
