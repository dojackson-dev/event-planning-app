-- Create security personnel table (Supabase version)
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS security (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  arrival_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_owner_id ON security(owner_id);
CREATE INDEX IF NOT EXISTS idx_security_event_id ON security(event_id);

ALTER TABLE security ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own security"
  ON security
  FOR ALL
  USING (auth.uid() = owner_id);
