-- Multi-day promoter events. An event runs from event_date through end_date (inclusive); a ticket, VIP
-- order or VIP guest pass is good on every day and is scanned once per day. Safe to run more than once.

ALTER TABLE public.public_events
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS timezone text;

ALTER TABLE public.public_events DROP CONSTRAINT IF EXISTS public_events_end_date_check;
ALTER TABLE public.public_events
  ADD CONSTRAINT public_events_end_date_check CHECK (end_date IS NULL OR end_date >= event_date);

-- One row per ticket per event day; the unique key is what stops a second scan on the same day.
CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  scan_date   date NOT NULL,
  scanned_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, scan_date)
);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket ON public.ticket_scans (ticket_id);

-- VIP orders: how many of the group have come in on each day.
CREATE TABLE IF NOT EXISTS public.vip_order_day_checkins (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_order_id      uuid NOT NULL REFERENCES public.vip_orders(id) ON DELETE CASCADE,
  scan_date         date NOT NULL,
  guests_checked_in integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vip_order_id, scan_date)
);

-- VIP guest passes: one scan per pass per day.
CREATE TABLE IF NOT EXISTS public.vip_pass_day_scans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_guest_pass_id  uuid NOT NULL REFERENCES public.vip_guest_passes(id) ON DELETE CASCADE,
  scan_date          date NOT NULL,
  scanned_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vip_guest_pass_id, scan_date)
);

-- Security guards: one arrival per guard per day (events with an end_date).
-- security_id takes whatever type security.id has (it is integer in some databases and uuid in others).
ALTER TABLE public.event ADD COLUMN IF NOT EXISTS end_date date;
DO $$
DECLARE
  id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO id_type
  FROM pg_attribute a
  WHERE a.attrelid = 'public.security'::regclass AND a.attname = 'id' AND NOT a.attisdropped;

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.security_day_arrivals (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      security_id   %s NOT NULL REFERENCES public.security(id) ON DELETE CASCADE,
      arrival_date  date NOT NULL,
      arrival_time  timestamptz NOT NULL DEFAULT now(),
      source        text CHECK (source IN ('guard', 'manager')),
      UNIQUE (security_id, arrival_date)
    )$f$, id_type);
END $$;

-- Only the backend (service role) reads or writes these.
ALTER TABLE public.ticket_scans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_order_day_checkins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_pass_day_scans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_day_arrivals   ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
