-- Venue photos shown on the public Find pages (up to 5 per venue, enforced by the API).
-- Vendors reuse the existing vendor_gallery table.
-- venue_id is TEXT (no foreign key) because venues.id is a UUID in some projects and a serial in others.
CREATE TABLE IF NOT EXISTS venue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_photos_venue ON venue_photos (venue_id, display_order);

ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;

-- Photos are public; writes only happen through the backend (service role), which checks ownership.
DROP POLICY IF EXISTS "Public can view venue photos" ON venue_photos;
CREATE POLICY "Public can view venue photos" ON venue_photos
  FOR SELECT USING (true);
