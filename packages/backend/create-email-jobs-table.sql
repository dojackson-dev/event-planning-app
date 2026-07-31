-- Signup email automation: scheduled/queued email jobs processed by a CRON job.
-- The CRON job is the "mailroom" — it only sends what's already been decided
-- and queued by application code (signup flow, weekly digest scheduler, etc.)

CREATE TABLE IF NOT EXISTS email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  portal_type TEXT,
  recipient_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_jobs_status_check CHECK (
    status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_email_jobs_due
  ON email_jobs (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_email_jobs_user_template
  ON email_jobs (user_id, template_key);

-- Track email-specific unsubscribes separately from SMS opt-in/out.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_unsubscribed_at TIMESTAMPTZ;

-- Backend accesses this table only via the service_role client (cron + signup
-- hooks), so lock it down from the anon/authenticated roles entirely.
ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY;
