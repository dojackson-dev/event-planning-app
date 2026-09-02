-- Fix cascade deletions so auth users can be deleted from Supabase dashboard
-- 
-- Problem: the user->owner-account chain still includes NO ACTION FKs that block
-- auth user deletion. When Supabase deletes an auth user, it cascades to public.users,
-- but that delete is still blocked by owner-account references in memberships,
-- client_profiles, and invites.
--
-- Fix chain:
--   auth.users → CASCADE → public.users → CASCADE → owner_accounts → CASCADE → memberships
--   public.users → CASCADE → owner_accounts → CASCADE → client_profiles/invites

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
-- Step 3: Fix memberships.owner_account_id to cascade when owner_accounts is deleted
-- ============================================================================
ALTER TABLE public.memberships
  DROP CONSTRAINT IF EXISTS memberships_owner_account_id_fkey;

ALTER TABLE public.memberships
  ADD CONSTRAINT memberships_owner_account_id_fkey
  FOREIGN KEY (owner_account_id) REFERENCES public.owner_accounts(id) ON DELETE CASCADE;

-- ============================================================================
-- Step 4: Ensure memberships.user_id cascades (should already be correct, but
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
