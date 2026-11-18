-- Staff Pay shifts (and the guard pay built on them) must point at the real events table, "event".
-- The first version pointed at "events", an older table, so linking a shift to an event failed.
-- Safe to run more than once. Run after create-staff-pay.sql.

-- Drop whatever foreign key staff_shifts.event_id has now.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = 'staff_shifts'
      AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'event_id'
  LOOP
    EXECUTE format('ALTER TABLE public.staff_shifts DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- Shifts that were linked to an id that is not an event cannot keep the link.
UPDATE public.staff_shifts SET event_id = NULL
WHERE event_id IS NOT NULL AND event_id NOT IN (SELECT id FROM public.event);

ALTER TABLE public.staff_shifts
  ADD CONSTRAINT staff_shifts_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.event(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
