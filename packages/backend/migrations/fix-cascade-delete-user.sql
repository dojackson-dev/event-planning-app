-- Fix cascade deletions so auth users can be deleted from Supabase dashboard
-- 
-- Problem: owner_accounts.primary_owner_id references public.users(id) WITHOUT ON DELETE CASCADE.
-- When Supabase deletes an auth user, it cascades to public.users, but that delete is
-- blocked by the owner_accounts FK → Supabase returns 500.
--
-- Fix chain:
--   auth.users → CASCADE → public.users → CASCADE → owner_accounts → CASCADE → venues (already set)

-- ============================================================================
-- Step 1: Ensure public.users.id cascades from auth.users deletions
-- ============================================================================
-- Drop existing FK if present, then re-add with CASCADE
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- Step 2: Fix owner_accounts.primary_owner_id to cascade when users row is deleted
-- ============================================================================
ALTER TABLE public.owner_accounts
  DROP CONSTRAINT IF EXISTS owner_accounts_primary_owner_id_fkey;

ALTER TABLE public.owner_accounts
  ADD CONSTRAINT owner_accounts_primary_owner_id_fkey
  FOREIGN KEY (primary_owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- Step 3: Ensure memberships.user_id cascades (should already be correct, but
--         re-apply safely in case it was created without CASCADE)
-- ============================================================================
ALTER TABLE public.memberships
  DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;

ALTER TABLE public.memberships
  ADD CONSTRAINT memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Verify all constraints are in place
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('owner_accounts', 'users', 'memberships')
ORDER BY tc.table_name, kcu.column_name;
