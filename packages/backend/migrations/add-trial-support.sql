-- Add trial support to owner_accounts table
ALTER TABLE owner_accounts 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_days_used INTEGER DEFAULT 0;

-- Create settings table for configurable trial days
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default trial days setting
INSERT INTO app_settings (key, value, description) 
VALUES ('FREE_TRIAL_DAYS', '30', 'Default number of days for free trial')
ON CONFLICT (key) DO NOTHING;

-- Add comment
COMMENT ON TABLE app_settings IS 'Global application settings - configurable via admin panel';
