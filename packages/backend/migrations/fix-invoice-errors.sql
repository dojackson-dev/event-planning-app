-- Fix for invoice errors: Missing columns and infinite recursion
-- Run this in Supabase SQL Editor

-- 1. RELOAD SCHEMA CACHE (this makes Supabase recognize the new columns)
NOTIFY pgrst, 'reload schema';

-- 2. Add the missing columns if they don't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0.00;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_due DECIMAL(10, 2) DEFAULT 0.00;

-- 3. Drop and recreate the problematic "Owners can create invoices" policy
DROP POLICY IF EXISTS "Owners can create invoices" ON invoices;

CREATE POLICY "Owners can create invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt()->>'role' IN ('owner', 'admin', 'authenticated')
  OR owner_id = auth.uid()
);

-- 4. Check if users table has RLS policies causing recursion
-- If the users table has a policy that queries itself, we need to fix it too
-- Let's see what policies exist on users table:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- Note: After running this, you may need to fix users table policies if they show up
-- Look for any policy that does: SELECT ... FROM users WHERE id = auth.uid()
-- Replace those with: auth.uid() = <column_name> or auth.jwt() checks
