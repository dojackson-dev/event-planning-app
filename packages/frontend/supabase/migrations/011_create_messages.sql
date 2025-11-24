-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  recipient_phone VARCHAR(50) NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('client', 'guest', 'security', 'custom')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('reminder', 'invoice', 'confirmation', 'update', 'custom')),
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  twilio_sid VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_event_id ON messages(event_id);
CREATE INDEX idx_messages_recipient_type ON messages(recipient_type);
CREATE INDEX idx_messages_message_type ON messages(message_type);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_twilio_sid ON messages(twilio_sid);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages table
-- Policy: Owners can view all messages
CREATE POLICY messages_owner_select_policy ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Clients can view messages sent to them
CREATE POLICY messages_client_select_policy ON messages
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Owners can insert messages
CREATE POLICY messages_owner_insert_policy ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Owners can update messages (mainly for status updates)
CREATE POLICY messages_owner_update_policy ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Owners can delete messages
CREATE POLICY messages_owner_delete_policy ON messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Comments for documentation
COMMENT ON TABLE messages IS 'Stores SMS message history sent via Twilio';
COMMENT ON COLUMN messages.recipient_phone IS 'Phone number of the message recipient';
COMMENT ON COLUMN messages.recipient_name IS 'Name of the message recipient';
COMMENT ON COLUMN messages.recipient_type IS 'Type of recipient: client, guest, security, or custom';
COMMENT ON COLUMN messages.user_id IS 'Optional reference to user if recipient is a registered user';
COMMENT ON COLUMN messages.event_id IS 'Optional reference to event associated with this message';
COMMENT ON COLUMN messages.message_type IS 'Type of message: reminder, invoice, confirmation, update, or custom';
COMMENT ON COLUMN messages.content IS 'The actual message content sent';
COMMENT ON COLUMN messages.status IS 'Delivery status: pending, sent, delivered, or failed';
COMMENT ON COLUMN messages.twilio_sid IS 'Twilio message SID for tracking';
COMMENT ON COLUMN messages.error_message IS 'Error message if sending failed';
COMMENT ON COLUMN messages.sent_at IS 'Timestamp when message was successfully sent';
COMMENT ON COLUMN messages.created_at IS 'Timestamp when message record was created';
