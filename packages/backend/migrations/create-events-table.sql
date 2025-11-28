-- Migration: Create event table
-- Run this in Supabase SQL Editor

-- Create event_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'scheduled', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create event table
CREATE TABLE IF NOT EXISTS event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic event information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  -- Venue and location
  venue VARCHAR(255),
  location TEXT,
  
  -- Guest information
  guest_count INTEGER,
  
  -- Status and tracking
  status event_status DEFAULT 'draft',
  
  -- Owner/Creator
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Budget
  budget DECIMAL(10, 2),
  
  -- Additional details
  notes TEXT,
  special_requirements TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_owner_id ON event(owner_id);
CREATE INDEX IF NOT EXISTS idx_event_date ON event(date);
CREATE INDEX IF NOT EXISTS idx_event_status ON event(status);
CREATE INDEX IF NOT EXISTS idx_event_created_at ON event(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_event_updated_at ON event;
CREATE TRIGGER update_event_updated_at
  BEFORE UPDATE ON event
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on event
ALTER TABLE event ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own events" ON event;
DROP POLICY IF EXISTS "Users can insert their own events" ON event;
DROP POLICY IF EXISTS "Users can update their own events" ON event;
DROP POLICY IF EXISTS "Users can delete their own events" ON event;

-- Create RLS policies
-- Policy: Users can view their own events
CREATE POLICY "Users can view their own events"
  ON event
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert their own events"
  ON event
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own events
CREATE POLICY "Users can update their own events"
  ON event
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete their own events"
  ON event
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Grant permissions
GRANT ALL ON event TO authenticated;
GRANT ALL ON event TO service_role;
