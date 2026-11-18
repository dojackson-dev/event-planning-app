-- Security on events: several guards per event, each with a post and report time, and a personal check-in
-- link (no login) that the guard taps on arrival. Safe to run more than once.

ALTER TABLE public.security
  ADD COLUMN IF NOT EXISTS post             text,
  ADD COLUMN IF NOT EXISTS notes            text,
  ADD COLUMN IF NOT EXISTS report_time      time,
  ADD COLUMN IF NOT EXISTS arrival_source   text CHECK (arrival_source IN ('guard', 'manager')),
  ADD COLUMN IF NOT EXISTS check_in_token   text;

-- Existing rows get a link too, and new rows always do.
UPDATE public.security SET check_in_token = replace(gen_random_uuid()::text, '-', '') WHERE check_in_token IS NULL;
ALTER TABLE public.security
  ALTER COLUMN check_in_token SET DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ALTER COLUMN check_in_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS security_check_in_token_idx ON public.security (check_in_token);

NOTIFY pgrst, 'reload schema';
