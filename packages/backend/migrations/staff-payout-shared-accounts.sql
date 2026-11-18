-- One person can work for several venues, or already be a vendor, so a Stripe account can belong to more
-- than one staff row. Replaces the unique index from add-staff-payouts.sql with a plain one.
-- Safe to run more than once. Run after add-staff-payouts.sql.

DROP INDEX IF EXISTS public.staff_members_stripe_account_idx;
CREATE INDEX IF NOT EXISTS staff_members_stripe_account_idx
  ON public.staff_members (stripe_account_id) WHERE stripe_account_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
