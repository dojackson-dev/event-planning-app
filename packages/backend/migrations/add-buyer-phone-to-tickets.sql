-- Adds optional buyer_phone to the tickets table so we can send
-- SMS confirmations after a Stripe ticket purchase completes.
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(20);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
