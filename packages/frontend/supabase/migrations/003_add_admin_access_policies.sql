-- Add admin access to intake_forms
DROP POLICY IF EXISTS "Users can view their own intake forms" ON intake_forms;
DROP POLICY IF EXISTS "Owners can view intake forms in their tenant" ON intake_forms;
DROP POLICY IF EXISTS "Users can view intake forms" ON intake_forms;

-- Users can view their own intake forms, admins can view all
CREATE POLICY "Users can view intake forms" ON intake_forms
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert policy for intake forms
DROP POLICY IF EXISTS "Users can insert their own intake forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can insert intake forms" ON intake_forms;

CREATE POLICY "Users can insert intake forms" ON intake_forms
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update policy for intake forms
DROP POLICY IF EXISTS "Users can update their own intake forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can update intake forms" ON intake_forms;

CREATE POLICY "Users can update intake forms" ON intake_forms
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Delete policy for intake forms
DROP POLICY IF EXISTS "Users can delete their own intake forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can delete intake forms" ON intake_forms;

CREATE POLICY "Users can delete intake forms" ON intake_forms
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add admin access to event table (singular, not events)
DROP POLICY IF EXISTS "Users can view their own events" ON event;
DROP POLICY IF EXISTS "Users can view events in their tenant" ON event;
DROP POLICY IF EXISTS "Owners can manage events in their tenant" ON event;
DROP POLICY IF EXISTS "Users can view events" ON event;

-- Admins and owners can view events
CREATE POLICY "Users can view events" ON event
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can manage their own events, admins can manage all
DROP POLICY IF EXISTS "Users can insert their own events" ON event;
DROP POLICY IF EXISTS "Users can update their own events" ON event;
DROP POLICY IF EXISTS "Users can delete their own events" ON event;
DROP POLICY IF EXISTS "Users can insert events" ON event;
DROP POLICY IF EXISTS "Users can update events" ON event;
DROP POLICY IF EXISTS "Users can delete events" ON event;

CREATE POLICY "Users can insert events" ON event
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update events" ON event
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete events" ON event
  FOR DELETE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add admin access to invoices (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
    DROP POLICY IF EXISTS "Owners can view invoices" ON invoices;
    DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
    DROP POLICY IF EXISTS "Owners can insert invoices" ON invoices;
    DROP POLICY IF EXISTS "Owners can update invoices" ON invoices;
    DROP POLICY IF EXISTS "Owners can delete invoices" ON invoices;
    
    -- Create new policies with admin access
    EXECUTE 'CREATE POLICY "Users can view invoices" ON invoices
      FOR SELECT USING (
        owner_id = auth.uid() OR
        booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = ''admin''
        )
      )';
    
    -- Insert policy
    EXECUTE 'CREATE POLICY "Owners can insert invoices" ON invoices
      FOR INSERT WITH CHECK (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = ''admin''
        )
      )';
    
    -- Update policy
    EXECUTE 'CREATE POLICY "Owners can update invoices" ON invoices
      FOR UPDATE USING (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = ''admin''
        )
      )';
    
    -- Delete policy
    EXECUTE 'CREATE POLICY "Owners can delete invoices" ON invoices
      FOR DELETE USING (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = ''admin''
        )
      )';
  END IF;
END $$;
