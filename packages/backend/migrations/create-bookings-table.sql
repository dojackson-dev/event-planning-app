-- Migration: Create booking table
-- Run this in Supabase SQL Editor

-- Create booking_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create booking table
CREATE TABLE IF NOT EXISTS booking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and event relationship
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  
  -- Booking details
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status booking_status DEFAULT 'pending',
  
  -- Payment information
  total_amount DECIMAL(10, 2),
  deposit_amount DECIMAL(10, 2),
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  
  -- Additional details
  notes TEXT,
  special_requests TEXT,
  
  -- Contact information (may differ from user)
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  
  -- Confirmation
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_booking_user_id ON booking(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_event_id ON booking(event_id);
CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(status);
CREATE INDEX IF NOT EXISTS idx_booking_created_at ON booking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_booking_date ON booking(booking_date);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_booking_updated_at ON booking;
CREATE TRIGGER update_booking_updated_at
  BEFORE UPDATE ON booking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on booking
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bookings" ON booking;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON booking;
DROP POLICY IF EXISTS "Users can update their own bookings" ON booking;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON booking;

-- Create RLS policies
-- Policy: Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
  ON booking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own bookings
CREATE POLICY "Users can insert their own bookings"
  ON booking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bookings
CREATE POLICY "Users can update their own bookings"
  ON booking
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bookings
CREATE POLICY "Users can delete their own bookings"
  ON booking
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON booking TO authenticated;
GRANT ALL ON booking TO service_role;
