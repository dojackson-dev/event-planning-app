-- Create security table
CREATE TABLE IF NOT EXISTS security (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  arrival_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for event lookups
CREATE INDEX idx_security_event_id ON security(event_id);

-- Create index for arrival time tracking
CREATE INDEX idx_security_arrival_time ON security(arrival_time);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_security_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_updated_at_trigger
  BEFORE UPDATE ON security
  FOR EACH ROW
  EXECUTE FUNCTION update_security_updated_at();

-- Enable Row Level Security
ALTER TABLE security ENABLE ROW LEVEL SECURITY;

-- Create policies for security table
-- Policy: Allow owners to view all security records
CREATE POLICY security_owner_select_policy ON security
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE "user".id = auth.uid()
      AND "user".role = 'owner'
    )
  );

-- Policy: Allow owners to insert security records
CREATE POLICY security_owner_insert_policy ON security
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE "user".id = auth.uid()
      AND "user".role = 'owner'
    )
  );

-- Policy: Allow owners to update security records
CREATE POLICY security_owner_update_policy ON security
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE "user".id = auth.uid()
      AND "user".role = 'owner'
    )
  );

-- Policy: Allow owners to delete security records
CREATE POLICY security_owner_delete_policy ON security
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE "user".id = auth.uid()
      AND "user".role = 'owner'
    )
  );

-- Comments for documentation
COMMENT ON TABLE security IS 'Stores security personnel information and event assignments';
COMMENT ON COLUMN security.name IS 'Full name of security personnel';
COMMENT ON COLUMN security.phone IS 'Contact phone number for security personnel';
COMMENT ON COLUMN security.event_id IS 'Optional event assignment (foreign key to events table)';
COMMENT ON COLUMN security.arrival_time IS 'Timestamp when security personnel arrived at event location';
COMMENT ON COLUMN security.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN security.updated_at IS 'Timestamp when record was last updated';
