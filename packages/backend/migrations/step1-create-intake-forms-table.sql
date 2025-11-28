-- Step 1: Create intake_forms table only
-- Run this first in Supabase SQL Editor

DROP TABLE IF EXISTS intake_forms CASCADE;

CREATE TABLE intake_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event information
  event_type VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  guest_count INTEGER,
  
  -- Contact information
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  
  -- Service requirements
  services_needed TEXT,
  
  -- Additional details
  special_requests TEXT,
  budget_range VARCHAR(100),
  how_did_you_hear VARCHAR(255),
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_intake_forms_user_id ON intake_forms(user_id);
CREATE INDEX idx_intake_forms_status ON intake_forms(status);
CREATE INDEX idx_intake_forms_created_at ON intake_forms(created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_intake_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_intake_forms_updated_at
BEFORE UPDATE ON intake_forms
FOR EACH ROW
EXECUTE FUNCTION update_intake_forms_updated_at();
