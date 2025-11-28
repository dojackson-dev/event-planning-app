-- Migration: Create intake_forms table
-- Run this in Supabase SQL Editor

-- Create intake_forms table
CREATE TABLE IF NOT EXISTS intake_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event information
  event_type event_type NOT NULL,
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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_intake_forms_user_id ON intake_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_forms_status ON intake_forms(status);
CREATE INDEX IF NOT EXISTS idx_intake_forms_created_at ON intake_forms(created_at DESC);

-- Enable RLS on intake_forms
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can insert their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can update their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can delete their own intake_forms" ON intake_forms;

-- Create RLS policies

-- Allow owners to view their own intake forms
CREATE POLICY "Users can view their own intake_forms"
ON intake_forms FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow owners to insert intake forms for themselves
CREATE POLICY "Users can insert their own intake_forms"
ON intake_forms FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow owners to update their own intake forms
CREATE POLICY "Users can update their own intake_forms"
ON intake_forms FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow owners to delete their own intake forms
CREATE POLICY "Users can delete their own intake_forms"
ON intake_forms FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_intake_forms_updated_at ON intake_forms;
CREATE TRIGGER update_intake_forms_updated_at
BEFORE UPDATE ON intake_forms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
