-- Log of messages sent to RSVP guests. Used to limit how often one event can be broadcast to and to keep a record.
CREATE TABLE IF NOT EXISTS rsvp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_form_id UUID NOT NULL,
  sent_by TEXT,
  audience TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  sms_sent INTEGER NOT NULL DEFAULT 0,
  email_sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_broadcasts_form ON rsvp_broadcasts (intake_form_id, created_at DESC);

-- Written and read only by the backend (service role).
ALTER TABLE rsvp_broadcasts ENABLE ROW LEVEL SECURITY;
