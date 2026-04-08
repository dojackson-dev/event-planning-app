-- Track when a client first opens/views an estimate or contract link
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- Allow anonymous/unauthenticated callers to set viewed_at once (first-open beacon)
-- Only allow updating viewed_at when it is currently NULL (first view only)
CREATE POLICY "allow_public_mark_contract_viewed"
  ON contracts
  FOR UPDATE
  USING (viewed_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "allow_public_mark_estimate_viewed"
  ON estimates
  FOR UPDATE
  USING (viewed_at IS NULL)
  WITH CHECK (true);
