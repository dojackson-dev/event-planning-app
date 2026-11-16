-- Staff pay: a venue's roster of paid staff, the shifts they work, and the hours they clock by text link.
-- Workers do not need a login. Each shift has its own secret link (clock_token) that is texted to the worker.
-- Safe to run more than once. Run on the Supabase SQL editor for each environment.

CREATE TABLE IF NOT EXISTS public.staff_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name              text NOT NULL,
  phone             text NOT NULL,
  email             text,
  job_title         text,
  default_pay_type  text NOT NULL DEFAULT 'hourly' CHECK (default_pay_type IN ('hourly', 'flat')),
  default_rate      numeric(10,2) NOT NULL DEFAULT 0 CHECK (default_rate >= 0),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, phone)
);

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Shifts are payroll history, so a worker with shifts cannot be deleted (deactivate them instead).
  staff_member_id   uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE RESTRICT,
  event_id          uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title             text NOT NULL,
  shift_date        date NOT NULL,
  start_time        time,
  end_time          time,
  pay_type          text NOT NULL CHECK (pay_type IN ('hourly', 'flat')),
  rate              numeric(10,2) NOT NULL CHECK (rate >= 0),
  status            text NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'clocked_in', 'submitted', 'approved', 'paid', 'cancelled')),
  clock_token       text NOT NULL UNIQUE,
  clock_in_at       timestamptz,
  clock_out_at      timestamptz,
  approved_minutes  integer CHECK (approved_minutes IS NULL OR approved_minutes >= 0),
  approved_amount   numeric(10,2) CHECK (approved_amount IS NULL OR approved_amount >= 0),
  approved_at       timestamptz,
  approved_by       uuid,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_shifts_owner_date_idx ON public.staff_shifts (owner_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS staff_shifts_member_idx ON public.staff_shifts (staff_member_id);
CREATE INDEX IF NOT EXISTS staff_shifts_event_idx ON public.staff_shifts (event_id);

-- All access goes through the backend with the service role; no direct client policies.
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
