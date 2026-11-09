-- Internal staff calling (Twilio Programmable Voice). Run once in the Supabase SQL editor.
--
-- Also needed to switch it on (nothing is dialled until all of these are set):
--   1. Render env var API_PUBLIC_URL = the backend's public https URL (no trailing slash). Webhook
--      signatures are checked against it, so it must match what Twilio calls exactly.
--   2. Twilio Console > Phone Numbers > the EventEcos number > Voice > "A call comes in":
--        Webhook, HTTP POST, <API_PUBLIC_URL>/calls/hook/incoming
--   3. Sign in as admin@eventecos.com > Calls, verify your cell phone, then turn calling on for each rep.
--
-- These tables are only ever read and written by the backend with the service key, so RLS is
-- enabled with no policies: the public/anon and signed-in keys cannot touch them.

CREATE TABLE IF NOT EXISTS public.call_staff (
  user_id               UUID PRIMARY KEY,
  kind                  TEXT NOT NULL CHECK (kind IN ('admin', 'sales')),
  display_name          TEXT,
  calling_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  receives_inbound      BOOLEAN NOT NULL DEFAULT FALSE,
  mobile_e164           TEXT,
  mobile_verified_at    TIMESTAMPTZ,
  pending_mobile_e164   TEXT,
  verify_code_hash      TEXT,
  verify_expires_at     TIMESTAMPTZ,
  verify_attempts       INT NOT NULL DEFAULT 0,
  verify_sent_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.call_settings (
  id                      INT PRIMARY KEY CHECK (id = 1),
  business_hours          JSONB,
  allowed_country_codes   TEXT[] NOT NULL DEFAULT ARRAY['+1'],
  max_calls_per_hour      INT NOT NULL DEFAULT 20,
  voicemail_greeting      TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.call_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.call_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction         TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  staff_user_id     UUID,
  staff_name        TEXT,
  client_phone      TEXT NOT NULL,
  client_name       TEXT,
  ref_type          TEXT,
  ref_id            TEXT,
  status            TEXT NOT NULL DEFAULT 'initiated',
  staff_call_sid    TEXT,
  client_call_sid   TEXT,
  answered_at       TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  duration_seconds  INT,
  outcome           TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS call_logs_staff_created_idx
  ON public.call_logs (staff_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS call_logs_phone_created_idx
  ON public.call_logs (client_phone, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS call_logs_client_sid_idx
  ON public.call_logs (client_call_sid) WHERE client_call_sid IS NOT NULL;
-- Duplicate-click protection: a staff member can only have one outbound call that is still being set up.
CREATE UNIQUE INDEX IF NOT EXISTS call_logs_one_pending_per_staff_idx
  ON public.call_logs (staff_user_id)
  WHERE direction = 'outbound' AND status IN ('initiated', 'staff_ringing', 'client_ringing');

CREATE TABLE IF NOT EXISTS public.call_voicemails (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id       UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  from_number       TEXT,
  recording_sid     TEXT NOT NULL UNIQUE,
  recording_url     TEXT NOT NULL,
  duration_seconds  INT,
  listened_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.call_staff      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_voicemails ENABLE ROW LEVEL SECURITY;
