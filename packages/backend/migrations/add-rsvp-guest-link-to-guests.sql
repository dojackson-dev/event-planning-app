-- Link door-list `guests` rows back to the `rsvp_guests` row they came from.
-- Enables automatic, live sync: when a guest responds to an RSVP invite
-- (attending/declined), the venue owner's Door List updates immediately
-- instead of requiring a manual "Import from RSVP" click.
-- Safe to run multiple times (idempotent).

BEGIN;

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS rsvp_guest_id UUID;

ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_rsvp_guest_id_fkey;
ALTER TABLE guests ADD CONSTRAINT guests_rsvp_guest_id_fkey
  FOREIGN KEY (rsvp_guest_id) REFERENCES rsvp_guests(id) ON DELETE CASCADE;

-- At most one door-list guest row per rsvp_guests row.
CREATE UNIQUE INDEX IF NOT EXISTS guests_rsvp_guest_id_idx
  ON guests(rsvp_guest_id)
  WHERE rsvp_guest_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
COMMIT;
