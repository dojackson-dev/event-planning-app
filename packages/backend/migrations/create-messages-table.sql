-- Migration: Create messages table for Twilio SMS campaign
-- Campaign: DoVenue Suite SMS (confirmations, reminders, support, announcements)

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('client', 'guest', 'security', 'custom')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('reminder', 'invoice', 'confirmation', 'update', 'support', 'announcement', 'custom')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  twilio_sid TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast owner-scoped queries
CREATE INDEX IF NOT EXISTS messages_owner_id_idx ON messages(owner_id);
CREATE INDEX IF NOT EXISTS messages_event_id_idx ON messages(event_id);
CREATE INDEX IF NOT EXISTS messages_status_idx ON messages(status);

-- RLS: owners can only see and manage their own messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_own_messages"
  ON messages
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
