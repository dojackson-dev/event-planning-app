-- Sales outreach (cold email) from the sales portal. Idempotent: safe to run more than once.
-- Run on every environment (demo first, then production). Sending is blocked until this has run.

-- Addresses that must never be emailed again (unsubscribed, bounced, complained).
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email       TEXT        PRIMARY KEY,
  reason      TEXT        NOT NULL DEFAULT 'unsubscribed'
                          CHECK (reason IN ('unsubscribed', 'bounced', 'complained', 'manual')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every outreach email the sales portal sent (or tried to send).
CREATE TABLE IF NOT EXISTS public.outreach_emails (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID        REFERENCES public.affiliates(id) ON DELETE SET NULL,
  recipient_type  TEXT        NOT NULL CHECK (recipient_type IN ('lead', 'user', 'email', 'test')),
  lead_id         UUID        REFERENCES public.demo_requests(id) ON DELETE SET NULL,
  user_id         UUID,
  to_email        TEXT        NOT NULL,
  to_name         TEXT,
  template        TEXT        NOT NULL,
  subject         TEXT        NOT NULL,
  status          TEXT        NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_id     TEXT,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_affiliate ON public.outreach_emails(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_recipient ON public.outreach_emails(to_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_lead      ON public.outreach_emails(lead_id);

-- Only the backend (service role) reads or writes these tables.
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_emails    ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
