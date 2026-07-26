-- ============================================================
-- AFFILIATE INVITES MIGRATION
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Table to store invite tokens sent by the sales manager
CREATE TABLE IF NOT EXISTS public.affiliate_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  invited_by  TEXT        NOT NULL,  -- email of the manager who sent the invite
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_invites_token ON public.affiliate_invites(token);

-- Index for email lookups (prevent double-inviting)
CREATE INDEX IF NOT EXISTS idx_affiliate_invites_email ON public.affiliate_invites(email);

-- RLS: only service role can access (backend uses admin client)
ALTER TABLE public.affiliate_invites ENABLE ROW LEVEL SECURITY;
