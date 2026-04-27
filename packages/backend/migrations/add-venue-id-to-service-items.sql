-- Add venue_id to service_items so packages are scoped per venue
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_items_venue_id ON service_items(venue_id);
