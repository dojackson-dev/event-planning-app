-- Migration: Add owner_id to all business tables for consistent ownership model
-- This ensures owners can track and manage all their business resources

-- Add owner_id to event table if it doesn't exist
ALTER TABLE event ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_event_owner_id ON event(owner_id);

-- Add owner_id to booking table if it doesn't exist
ALTER TABLE booking ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_booking_owner_id ON booking(owner_id);

-- Add owner_id to items table if it doesn't exist (service items owned by business owner)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items') THEN
    ALTER TABLE items ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_items_owner_id ON items(owner_id);
  END IF;
END $$;

-- Add owner_id to contracts table if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_contracts_owner_id ON contracts(owner_id);
  END IF;
END $$;

-- Add owner_id to payments table if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON payments(owner_id);
  END IF;
END $$;

-- Add owner_id to messages table if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_messages_owner_id ON messages(owner_id);
  END IF;
END $$;

-- Update RLS policies for event table
DROP POLICY IF EXISTS "Users can view events" ON event;
DROP POLICY IF EXISTS "Users can insert events" ON event;
DROP POLICY IF EXISTS "Users can update events" ON event;
DROP POLICY IF EXISTS "Users can delete events" ON event;

CREATE POLICY "Users can view events" ON event
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert events" ON event
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update events" ON event
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete events" ON event
  FOR DELETE USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Update RLS policies for booking table
DROP POLICY IF EXISTS "Users can view their own bookings" ON booking;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON booking;
DROP POLICY IF EXISTS "Users can update their own bookings" ON booking;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON booking;

CREATE POLICY "Users can view bookings" ON booking
  FOR SELECT USING (
    user_id = auth.uid() OR
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert bookings" ON booking
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update bookings" ON booking
  FOR UPDATE USING (
    user_id = auth.uid() OR
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete bookings" ON booking
  FOR DELETE USING (
    user_id = auth.uid() OR
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Update RLS policies for items table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items') THEN
    DROP POLICY IF EXISTS "Users can view items" ON items;
    DROP POLICY IF EXISTS "Users can insert items" ON items;
    DROP POLICY IF EXISTS "Users can update items" ON items;
    DROP POLICY IF EXISTS "Users can delete items" ON items;

    EXECUTE 'CREATE POLICY "Users can view items" ON items
      FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';

    EXECUTE 'CREATE POLICY "Owners can insert items" ON items
      FOR INSERT WITH CHECK (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';

    EXECUTE 'CREATE POLICY "Owners can update items" ON items
      FOR UPDATE USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';

    EXECUTE 'CREATE POLICY "Owners can delete items" ON items
      FOR DELETE USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';
  END IF;
END $$;

-- Update RLS policies for contracts table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    DROP POLICY IF EXISTS "Users can view contracts" ON contracts;
    
    EXECUTE 'CREATE POLICY "Users can view contracts" ON contracts
      FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';

    EXECUTE 'CREATE POLICY "Owners can manage contracts" ON contracts
      FOR ALL USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';
  END IF;
END $$;

-- Update RLS policies for payments table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    DROP POLICY IF EXISTS "Users can view payments" ON payments;
    
    EXECUTE 'CREATE POLICY "Users can view payments" ON payments
      FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';

    EXECUTE 'CREATE POLICY "Owners can manage payments" ON payments
      FOR ALL USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';
  END IF;
END $$;

-- Update RLS policies for messages table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    DROP POLICY IF EXISTS "Users can view messages" ON messages;
    
    EXECUTE 'CREATE POLICY "Users can view messages" ON messages
      FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';

    EXECUTE 'CREATE POLICY "Owners can manage messages" ON messages
      FOR ALL USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')
      )';
  END IF;
END $$;
