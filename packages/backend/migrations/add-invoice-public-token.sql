-- Migration: Add public_token to invoices for client-facing payment pages
-- The token allows unauthenticated access to the payment page without exposing the invoice UUID.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid();

-- Backfill any rows that got NULL (shouldn't happen with DEFAULT, but just in case)
UPDATE invoices SET public_token = gen_random_uuid() WHERE public_token IS NULL;

-- Make it non-nullable and unique after backfill
ALTER TABLE invoices ALTER COLUMN public_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_public_token_idx ON invoices(public_token);
