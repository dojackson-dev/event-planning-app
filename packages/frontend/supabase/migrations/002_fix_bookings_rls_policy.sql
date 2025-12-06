-- Add owner_id column to bookings table to track which owner created the booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON bookings(owner_id);

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;

-- Create updated policy: users can see their own bookings, owners can see bookings they created
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (
    user_id = auth.uid() OR
    owner_id = auth.uid()
  );

-- Also update insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;

CREATE POLICY "Users can insert their own bookings" ON bookings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    owner_id = auth.uid()
  );

-- Update policy if it exists
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid() OR
    owner_id = auth.uid()
  );

-- Delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own bookings" ON bookings;

CREATE POLICY "Users can delete their own bookings" ON bookings
  FOR DELETE USING (
    user_id = auth.uid() OR
    owner_id = auth.uid()
  );
