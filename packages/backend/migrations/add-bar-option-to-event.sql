-- Add barOption column to event table
ALTER TABLE event ADD COLUMN IF NOT EXISTS bar_option VARCHAR(255) DEFAULT 'none';
