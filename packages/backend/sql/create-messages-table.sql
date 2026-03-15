-- Messages table migration for Supabase
-- Safe to run whether the table exists or not

-- Create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add all required columns if they are missing
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_type TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS twilio_sid TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to ensure it's up to date
DROP POLICY IF EXISTS "owners_manage_messages" ON messages;
CREATE POLICY "owners_manage_messages" ON messages
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Index for faster owner queries
CREATE INDEX IF NOT EXISTS idx_messages_owner_id ON messages(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_event_id ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_updated_at ON messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_messages_updated_at();
