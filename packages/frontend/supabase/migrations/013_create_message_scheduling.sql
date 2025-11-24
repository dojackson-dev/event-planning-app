-- Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('reminder', 'invoice', 'confirmation', 'update', 'custom')),
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  send_before_days INTEGER,
  send_time VARCHAR(5),
  repeat_interval_days INTEGER,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('client', 'guest', 'security', 'all')),
  auto_send BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scheduled_messages table
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES message_templates(id) ON DELETE SET NULL,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('client', 'guest', 'security', 'all')),
  content TEXT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_message_templates_type ON message_templates(message_type);
CREATE INDEX idx_message_templates_active ON message_templates(is_active);
CREATE INDEX idx_scheduled_messages_event ON scheduled_messages(event_id);
CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX idx_scheduled_messages_template ON scheduled_messages(template_id);

-- Create updated_at trigger for message_templates
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_templates_updated_at_trigger
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_templates_updated_at();

-- Enable Row Level Security
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Policies for message_templates table
CREATE POLICY message_templates_owner_policy ON message_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policies for scheduled_messages table
CREATE POLICY scheduled_messages_owner_policy ON scheduled_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Comments for documentation
COMMENT ON TABLE message_templates IS 'Stores message templates with scheduling rules';
COMMENT ON COLUMN message_templates.send_before_days IS 'Days before event to send message';
COMMENT ON COLUMN message_templates.send_time IS 'Time of day to send (HH:MM format)';
COMMENT ON COLUMN message_templates.repeat_interval_days IS 'Days between recurring reminders';
COMMENT ON COLUMN message_templates.auto_send IS 'Automatically send when conditions are met';

COMMENT ON TABLE scheduled_messages IS 'Stores scheduled messages to be sent at specific times';
COMMENT ON COLUMN scheduled_messages.scheduled_for IS 'Timestamp when message should be sent';
COMMENT ON COLUMN scheduled_messages.status IS 'Current status: pending, sent, cancelled, or failed';
