-- Migration: Add owner support to service_items and setup RLS
-- Run this in Supabase SQL Editor

-- Note: Service items belong to owners (owner_id references users.id where role='owner')
-- - Items are owned and managed by owner users
-- - Staff users in the same tenant can VIEW items from their owner
-- - Global items (owner_id IS NULL) are visible to everyone

-- 1. Add owner_id column if it doesn't exist
ALTER TABLE service_items 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- 2. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_items_owner_id ON service_items(owner_id);

-- 3. Enable RLS on service_items
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view service_items from their owner" ON service_items;
DROP POLICY IF EXISTS "Users can insert service_items for their owner" ON service_items;
DROP POLICY IF EXISTS "Users can update service_items from their owner" ON service_items;
DROP POLICY IF EXISTS "Users can delete service_items from their owner" ON service_items;

-- 5. Create RLS policies

-- Allow users to view service_items:
-- - Global items (owner_id IS NULL) visible to everyone
-- - Owner's own items (owner_id = auth.uid())
-- - Staff can see items from owner with same tenant_id
CREATE POLICY "Users can view service_items from their owner"
ON service_items FOR SELECT
TO authenticated
USING (
  owner_id IS NULL OR 
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT id FROM users 
    WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND role = 'owner'
  )
);

-- Allow owners to insert service_items for themselves
-- Admins can create global items (owner_id IS NULL)
CREATE POLICY "Users can insert service_items for their owner"
ON service_items FOR INSERT
TO authenticated
WITH CHECK (
  (owner_id = auth.uid() AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner') OR
  (owner_id IS NULL AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
);

-- Allow owners to update their service_items
-- Admins can update global items
CREATE POLICY "Users can update service_items from their owner"
ON service_items FOR UPDATE
TO authenticated
USING (
  (owner_id = auth.uid() AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner') OR
  (owner_id IS NULL AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
)
WITH CHECK (
  (owner_id = auth.uid() AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner') OR
  (owner_id IS NULL AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
);

-- Allow owners to delete their service_items
-- Admins can delete global items
CREATE POLICY "Users can delete service_items from their owner"
ON service_items FOR DELETE
TO authenticated
USING (
  (owner_id = auth.uid() AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner') OR
  (owner_id IS NULL AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
);

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON service_items TO authenticated;

-- Note: 
-- - Global items (owner_id IS NULL) are managed by admins and visible to all
-- - Owner users create service items for their facility (owner_id = their user id)
-- - Staff users with same tenant_id can view the owner's items
