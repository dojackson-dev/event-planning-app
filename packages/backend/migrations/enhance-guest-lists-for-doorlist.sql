-- Enhance guest_lists table for door list feature with anonymous access
-- 
-- PREREQUISITE: Run add-security-role.sql FIRST to add 'security' to user_role enum
-- 
-- This migration adds support for:
-- 1. Owner, planner, and security role access
-- 2. Client associates access via link and code
-- 3. Anonymous access with proper validation

-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "guest_lists_client_select_policy" ON guest_lists;
DROP POLICY IF EXISTS "guests_client_select_policy" ON guests;

-- Drop new policies if they exist (for idempotent reruns)
DROP POLICY IF EXISTS "guest_lists_anonymous_access_with_code" ON guest_lists;
DROP POLICY IF EXISTS "guest_lists_client_view" ON guest_lists;
DROP POLICY IF EXISTS "guest_lists_owner_view" ON guest_lists;
DROP POLICY IF EXISTS "guest_lists_security_view" ON guest_lists;
DROP POLICY IF EXISTS "guest_lists_client_update" ON guest_lists;
DROP POLICY IF EXISTS "guests_anonymous_access" ON guests;
DROP POLICY IF EXISTS "guests_anonymous_insert" ON guests;
DROP POLICY IF EXISTS "guests_anonymous_update" ON guests;
DROP POLICY IF EXISTS "guests_authenticated_client_view" ON guests;
DROP POLICY IF EXISTS "guests_authenticated_client_insert" ON guests;
DROP POLICY IF EXISTS "guests_authenticated_client_update" ON guests;
DROP POLICY IF EXISTS "guests_authenticated_client_delete" ON guests;
DROP POLICY IF EXISTS "guests_security_view" ON guests;
DROP POLICY IF EXISTS "guests_security_update_arrival" ON guests;

-- Add new RLS policies for guest_lists

-- Policy: Allow anonymous access with valid access code (for shared links)
CREATE POLICY "guest_lists_anonymous_access_with_code" ON guest_lists
  FOR SELECT
  TO anon
  USING (true); -- We'll validate access_code in the application layer

-- Policy: Allow authenticated users (clients) to view their own guest lists
CREATE POLICY "guest_lists_client_view" ON guest_lists
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Policy: Allow owners to view all guest lists
CREATE POLICY "guest_lists_owner_view" ON guest_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Allow security/staff to view all guest lists (for door checking)
CREATE POLICY "guest_lists_security_view" ON guest_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('security', 'owner', 'planner')
    )
  );

-- Policy: Clients can update their own guest lists (if not locked)
CREATE POLICY "guest_lists_client_update" ON guest_lists
  FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid() AND is_locked = false
  )
  WITH CHECK (
    client_id = auth.uid() AND is_locked = false
  );

-- Add new RLS policies for guests table

-- Policy: Allow anonymous access to guests (for shared links with code validation)
CREATE POLICY "guests_anonymous_access" ON guests
  FOR SELECT
  TO anon
  USING (true); -- Application layer will validate access_code

-- Policy: Allow anonymous to add guests (for shared links with code validation)
CREATE POLICY "guests_anonymous_insert" ON guests
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guest_lists
      WHERE guest_lists.id = guests.guest_list_id
      AND guest_lists.is_locked = false
    )
  );

-- Policy: Allow anonymous to update guests (for shared links with code validation)
CREATE POLICY "guests_anonymous_update" ON guests
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM guest_lists
      WHERE guest_lists.id = guests.guest_list_id
      AND guest_lists.is_locked = false
    )
  );

-- Policy: Authenticated clients can view guests in their lists
CREATE POLICY "guests_authenticated_client_view" ON guests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guest_lists
      WHERE guest_lists.id = guests.guest_list_id
      AND guest_lists.client_id = auth.uid()
    )
  );

-- Policy: Authenticated clients can add guests to their lists (if not locked)
CREATE POLICY "guests_authenticated_client_insert" ON guests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guest_lists
      WHERE guest_lists.id = guests.guest_list_id
      AND guest_lists.client_id = auth.uid()
      AND guest_lists.is_locked = false
    )
  );

-- Policy: Authenticated clients can update guests in their lists (if not locked)
CREATE POLICY "guests_authenticated_client_update" ON guests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guest_lists
      WHERE guest_lists.id = guests.guest_list_id
      AND guest_lists.client_id = auth.uid()
      AND guest_lists.is_locked = false
    )
  );

-- Policy: Authenticated clients can delete guests from their lists (if not locked)
CREATE POLICY "guests_authenticated_client_delete" ON guests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guest_lists
      WHERE guest_lists.id = guests.guest_list_id
      AND guest_lists.client_id = auth.uid()
      AND guest_lists.is_locked = false
    )
  );

-- Policy: Security/staff can view all guests
CREATE POLICY "guests_security_view" ON guests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('security', 'owner', 'planner')
    )
  );

-- Policy: Security/staff can update guest arrival status
CREATE POLICY "guests_security_update_arrival" ON guests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('security', 'owner', 'planner')
    )
  );

-- Create a function to validate access code (for use in backend)
CREATE OR REPLACE FUNCTION validate_guest_list_access(
  p_guest_list_id INTEGER,
  p_access_code VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM guest_lists
    WHERE id = p_guest_list_id
    AND access_code = UPPER(p_access_code)
  );
END;
$$;

-- Grant execute permission on the validation function
GRANT EXECUTE ON FUNCTION validate_guest_list_access TO anon, authenticated;

-- Comments for the new security model
COMMENT ON POLICY "guest_lists_anonymous_access_with_code" ON guest_lists IS 
  'Allows anonymous users to view guest lists. Access code validation happens in application layer.';
COMMENT ON POLICY "guest_lists_security_view" ON guest_lists IS 
  'Allows security, owner and planner roles to view all guest lists for door checking.';
COMMENT ON FUNCTION validate_guest_list_access IS 
  'Validates if a given access code matches a guest list. Used by backend for anonymous access.';
