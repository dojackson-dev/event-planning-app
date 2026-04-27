-- Add event_id to invoices table for direct event linkage
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES event(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_event_id ON invoices(event_id);
