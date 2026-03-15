-- ============================================================
-- Migration: Multiple Roles Support
-- Run this in Supabase SQL Editor (or via the run-migration script)
-- ============================================================

-- 1. Add roles TEXT[] array column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- 2. Backfill: populate roles[] from the existing single role column
--    so every current user gets their role in the new array too
UPDATE users
SET roles = ARRAY[role]
WHERE role IS NOT NULL
  AND (roles IS NULL OR roles = '{}' OR array_length(roles, 1) IS NULL);

-- 3. GIN index for fast array-contains queries
--    e.g.  WHERE 'owner' = ANY(roles)
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

-- 4. Verify the migration
SELECT
  id,
  email,
  role,
  roles
FROM users
ORDER BY created_at DESC
LIMIT 20;
