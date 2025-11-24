-- Create guest_lists table
CREATE TABLE IF NOT EXISTS guest_lists (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  max_guests_per_person INTEGER DEFAULT 0,
  access_code VARCHAR(20) UNIQUE NOT NULL,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  arrival_token VARCHAR(255) UNIQUE NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  guest_list_id INTEGER NOT NULL REFERENCES guest_lists(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  plus_one_count INTEGER DEFAULT 0,
  has_arrived BOOLEAN DEFAULT FALSE,
  arrived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_guest_lists_client_id ON guest_lists(client_id);
CREATE INDEX idx_guest_lists_event_id ON guest_lists(event_id);
CREATE INDEX idx_guest_lists_access_code ON guest_lists(access_code);
CREATE INDEX idx_guest_lists_share_token ON guest_lists(share_token);
CREATE INDEX idx_guest_lists_arrival_token ON guest_lists(arrival_token);
CREATE INDEX idx_guests_guest_list_id ON guests(guest_list_id);
CREATE INDEX idx_guests_has_arrived ON guests(has_arrived);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_guest_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guest_lists_updated_at_trigger
  BEFORE UPDATE ON guest_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_lists_updated_at();

CREATE OR REPLACE FUNCTION update_guests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guests_updated_at_trigger
  BEFORE UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION update_guests_updated_at();

-- Enable Row Level Security
ALTER TABLE guest_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Policies for guest_lists table
-- Policy: Owners can view all guest lists
CREATE POLICY guest_lists_owner_select_policy ON guest_lists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Clients can view their own guest lists
CREATE POLICY guest_lists_client_select_policy ON guest_lists
  FOR SELECT
  USING (client_id = auth.uid());

-- Policy: Owners can insert guest lists
CREATE POLICY guest_lists_owner_insert_policy ON guest_lists
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Owners can update guest lists
CREATE POLICY guest_lists_owner_update_policy ON guest_lists
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Owners can delete guest lists
CREATE POLICY guest_lists_owner_delete_policy ON guest_lists
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policies for guests table
-- Policy: Owners can view all guests
CREATE POLICY guests_owner_select_policy ON guests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Clients can view guests in their lists
CREATE POLICY guests_client_select_policy ON guests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guest_lists
      WHERE guest_lists.id = guests.guest_list_id
      AND guest_lists.client_id = auth.uid()
    )
  );

-- Policy: Owners can insert guests
CREATE POLICY guests_owner_insert_policy ON guests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Owners can update guests
CREATE POLICY guests_owner_update_policy ON guests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Owners can delete guests
CREATE POLICY guests_owner_delete_policy ON guests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Comments for documentation
COMMENT ON TABLE guest_lists IS 'Stores guest list configurations for events';
COMMENT ON COLUMN guest_lists.client_id IS 'Client who owns this guest list';
COMMENT ON COLUMN guest_lists.event_id IS 'Event associated with this guest list';
COMMENT ON COLUMN guest_lists.max_guests_per_person IS 'Maximum number of plus ones allowed per guest';
COMMENT ON COLUMN guest_lists.share_token IS 'Unique token for sharing the guest list edit link with clients';
COMMENT ON COLUMN guest_lists.arrival_token IS 'Unique token for the arrival tracking/door list link';
COMMENT ON COLUMN guest_lists.is_locked IS 'When true, prevents clients from adding/editing guests';

COMMENT ON TABLE guests IS 'Stores individual guests in a guest list';
COMMENT ON COLUMN guests.guest_list_id IS 'Reference to the parent guest list';
COMMENT ON COLUMN guests.name IS 'Guest full name';
COMMENT ON COLUMN guests.phone IS 'Guest phone number';
COMMENT ON COLUMN guests.plus_one_count IS 'Number of additional guests this person is bringing';
COMMENT ON COLUMN guests.has_arrived IS 'Whether the guest has arrived at the event';
COMMENT ON COLUMN guests.arrived_at IS 'Timestamp when the guest was checked in';
