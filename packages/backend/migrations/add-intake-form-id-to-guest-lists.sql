-- Add intake_form_id to guest_lists so the owner can associate a client's intake form
-- This allows SMS-to-client and other features to find the client's phone number
-- Using TEXT (no FK) so it stays resilient if the intake form is deleted

ALTER TABLE guest_lists
  ADD COLUMN IF NOT EXISTS intake_form_id TEXT;

CREATE INDEX IF NOT EXISTS guest_lists_intake_form_id_idx ON guest_lists(intake_form_id);
