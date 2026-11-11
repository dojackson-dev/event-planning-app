-- Event team members can always see the estimates and invoices for their event.
-- This flag lets the original client also allow a member to approve estimates and pay invoices.
-- Safe to run more than once. Run on the Supabase SQL editor for each environment.

ALTER TABLE public.event_team_members
  ADD COLUMN IF NOT EXISTS can_manage_billing boolean NOT NULL DEFAULT false;
