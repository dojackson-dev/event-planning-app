-- Allow 'security' as a vendor category (security staff use the vendor dashboard:
-- bookings, invoices, calendar, payouts, plus a check-in door list for assigned events).
-- Safe to run more than once. Run on the Supabase SQL editor for each environment.

DO $$
DECLARE c record;
BEGIN
  -- Drop whatever CHECK on vendor_accounts restricts the category column (name varies by environment).
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.vendor_accounts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE public.vendor_accounts DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.vendor_accounts
  ADD CONSTRAINT vendor_accounts_category_check CHECK (category IN (
    'dj', 'decorator', 'planner_coordinator', 'furniture', 'photographer',
    'musicians', 'mc_host', 'graphic_designer', 'security', 'other'
  ));
