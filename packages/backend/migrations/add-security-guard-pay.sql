-- Guards can be paid through Staff Pay: each paid guard on an event gets a Staff Pay shift, and the
-- security row points at it. Run after create-staff-pay.sql and add-security-event-workflow.sql.
-- Safe to run more than once.

ALTER TABLE public.security
  ADD COLUMN IF NOT EXISTS staff_shift_id uuid REFERENCES public.staff_shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS security_staff_shift_idx ON public.security (staff_shift_id);

NOTIFY pgrst, 'reload schema';
