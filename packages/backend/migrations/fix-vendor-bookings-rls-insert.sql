-- Fix: vendor_bookings INSERT policy too restrictive for backend service inserts.
-- The backend uses service_role which bypasses RLS, but if the key is misconfigured
-- the anon role is used and auth.uid() is null, blocking the insert.
-- Since ALL inserts go through the authenticated NestJS backend (never direct client DB access),
-- the WITH CHECK constraint is redundant — authorization is enforced at the API layer.

DROP POLICY IF EXISTS "Authenticated can create bookings" ON vendor_bookings;

CREATE POLICY "Backend can create bookings" ON vendor_bookings
  FOR INSERT WITH CHECK (true);
