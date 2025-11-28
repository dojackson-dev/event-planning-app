-- Migration: Complete intake_forms table setup
-- Run this in Supabase SQL Editor after running create-intake-forms-table.sql

-- Create event_type enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'wedding',
    'corporate',
    'birthday',
    'anniversary',
    'conference',
    'workshop',
    'party',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create intake_forms table if it doesn't exist
CREATE TABLE IF NOT EXISTS intake_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event information
  event_type event_type NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  guest_count INTEGER,
  venue_preference VARCHAR(255),
  
  -- Contact information
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  
  -- Service requirements
  services_needed TEXT,
  catering_requirements TEXT,
  equipment_needs TEXT,
  
  -- Additional details
  special_requests TEXT,
  dietary_restrictions TEXT,
  accessibility_requirements TEXT,
  budget_range VARCHAR(100),
  how_did_you_hear VARCHAR(255),
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'new',
  priority VARCHAR(20) DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  
  -- Follow-up
  follow_up_date DATE,
  last_contacted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_intake_forms_user_id ON intake_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_forms_status ON intake_forms(status);
CREATE INDEX IF NOT EXISTS idx_intake_forms_created_at ON intake_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_forms_event_date ON intake_forms(event_date);
CREATE INDEX IF NOT EXISTS idx_intake_forms_assigned_to ON intake_forms(assigned_to);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_intake_forms_updated_at ON intake_forms;
CREATE TRIGGER update_intake_forms_updated_at
  BEFORE UPDATE ON intake_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on intake_forms
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can insert their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can update their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can delete their own intake_forms" ON intake_forms;

-- Create RLS policies
-- Policy: Users can view their own intake forms
CREATE POLICY "Users can view their own intake_forms"
  ON intake_forms
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own intake forms
CREATE POLICY "Users can insert their own intake_forms"
  ON intake_forms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own intake forms
CREATE POLICY "Users can update their own intake_forms"
  ON intake_forms
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own intake forms
CREATE POLICY "Users can delete their own intake_forms"
  ON intake_forms
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON intake_forms TO authenticated;
GRANT ALL ON intake_forms TO service_role;
