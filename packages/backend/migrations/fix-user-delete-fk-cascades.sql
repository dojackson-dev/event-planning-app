-- Fix FK constraints that block auth user deletion from Supabase dashboard.
--
-- When auth.users is deleted it cascades to public.users, but these tables
-- still hold references to auth.users (or public.users) with NO ACTION,
-- which causes Supabase to return a 500 / "database error".

-- ============================================================================
-- vendor_bookings.booked_by_user_id → ON DELETE CASCADE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vendor_bookings'
      AND column_name = 'booked_by_user_id'
  ) THEN
    DELETE FROM public.vendor_bookings vb
    WHERE vb.booked_by_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = vb.booked_by_user_id
      );

    ALTER TABLE public.vendor_bookings
      DROP CONSTRAINT IF EXISTS vendor_bookings_booked_by_user_id_fkey;

    ALTER TABLE public.vendor_bookings
      ADD CONSTRAINT vendor_bookings_booked_by_user_id_fkey
      FOREIGN KEY (booked_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping vendor_bookings.booked_by_user_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- vendor_reviews.reviewer_user_id → ON DELETE CASCADE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vendor_reviews'
      AND column_name = 'reviewer_user_id'
  ) THEN
    DELETE FROM public.vendor_reviews vr
    WHERE vr.reviewer_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = vr.reviewer_user_id
      );

    ALTER TABLE public.vendor_reviews
      DROP CONSTRAINT IF EXISTS vendor_reviews_reviewer_user_id_fkey;

    ALTER TABLE public.vendor_reviews
      ADD CONSTRAINT vendor_reviews_reviewer_user_id_fkey
      FOREIGN KEY (reviewer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping vendor_reviews.reviewer_user_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- invites.accepted_by → ON DELETE SET NULL
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invites'
      AND column_name = 'accepted_by'
  ) THEN
    UPDATE public.invites i
    SET accepted_by = NULL
    WHERE i.accepted_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = i.accepted_by
      );

    ALTER TABLE public.invites
      DROP CONSTRAINT IF EXISTS invites_accepted_by_fkey;

    ALTER TABLE public.invites
      ADD CONSTRAINT invites_accepted_by_fkey
      FOREIGN KEY (accepted_by) REFERENCES public.users(id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'Skipping invites.accepted_by (column missing)';
  END IF;
END $$;

-- ============================================================================
-- service_items.owner_id → ON DELETE SET NULL
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_items'
      AND column_name = 'owner_id'
  ) THEN
    UPDATE public.service_items si
    SET owner_id = NULL
    WHERE si.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = si.owner_id
      );

    ALTER TABLE public.service_items
      DROP CONSTRAINT IF EXISTS service_items_owner_id_fkey;

    ALTER TABLE public.service_items
      ADD CONSTRAINT service_items_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'Skipping service_items.owner_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- intake_forms.assigned_to → ON DELETE SET NULL
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'intake_forms'
      AND column_name = 'assigned_to'
  ) THEN
    UPDATE public.intake_forms ifm
    SET assigned_to = NULL
    WHERE ifm.assigned_to IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = ifm.assigned_to
      );

    ALTER TABLE public.intake_forms
      DROP CONSTRAINT IF EXISTS intake_forms_assigned_to_fkey;

    ALTER TABLE public.intake_forms
      ADD CONSTRAINT intake_forms_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'Skipping intake_forms.assigned_to (column missing)';
  END IF;
END $$;

-- ============================================================================
-- activity_log.actor_user_id → ON DELETE SET NULL
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activity_log'
      AND column_name = 'actor_user_id'
  ) THEN
    UPDATE public.activity_log al
    SET actor_user_id = NULL
    WHERE al.actor_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = al.actor_user_id
      );

    ALTER TABLE public.activity_log
      DROP CONSTRAINT IF EXISTS activity_log_actor_user_id_fkey;

    ALTER TABLE public.activity_log
      ADD CONSTRAINT activity_log_actor_user_id_fkey
      FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'Skipping activity_log.actor_user_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- artist_accounts.user_id → ON DELETE CASCADE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'artist_accounts'
      AND column_name = 'user_id'
  ) THEN
    DELETE FROM public.artist_accounts aa
    WHERE aa.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = aa.user_id
      );

    ALTER TABLE public.artist_accounts
      DROP CONSTRAINT IF EXISTS artist_accounts_user_id_fkey;

    ALTER TABLE public.artist_accounts
      ADD CONSTRAINT artist_accounts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping artist_accounts.user_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- promoter_accounts.user_id → ON DELETE CASCADE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'promoter_accounts'
      AND column_name = 'user_id'
  ) THEN
    DELETE FROM public.promoter_accounts pa
    WHERE pa.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = pa.user_id
      );

    ALTER TABLE public.promoter_accounts
      DROP CONSTRAINT IF EXISTS promoter_accounts_user_id_fkey;

    ALTER TABLE public.promoter_accounts
      ADD CONSTRAINT promoter_accounts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping promoter_accounts.user_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- client_profiles.user_id → ON DELETE CASCADE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_profiles'
      AND column_name = 'user_id'
  ) THEN
    DELETE FROM public.client_profiles cp
    WHERE cp.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = cp.user_id
      );

    ALTER TABLE public.client_profiles
      DROP CONSTRAINT IF EXISTS client_profiles_user_id_fkey;

    ALTER TABLE public.client_profiles
      ADD CONSTRAINT client_profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping client_profiles.user_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- client_profiles.owner_account_id → ON DELETE CASCADE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_profiles'
      AND column_name = 'owner_account_id'
  ) THEN
    DELETE FROM public.client_profiles cp
    WHERE cp.owner_account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.owner_accounts oa WHERE oa.id = cp.owner_account_id
      );

    ALTER TABLE public.client_profiles
      DROP CONSTRAINT IF EXISTS client_profiles_owner_account_id_fkey;

    ALTER TABLE public.client_profiles
      ADD CONSTRAINT client_profiles_owner_account_id_fkey
      FOREIGN KEY (owner_account_id) REFERENCES public.owner_accounts(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping client_profiles.owner_account_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- invites.owner_account_id → ON DELETE CASCADE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invites'
      AND column_name = 'owner_account_id'
  ) THEN
    DELETE FROM public.invites i
    WHERE i.owner_account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.owner_accounts oa WHERE oa.id = i.owner_account_id
      );

    ALTER TABLE public.invites
      DROP CONSTRAINT IF EXISTS invites_owner_account_id_fkey;

    ALTER TABLE public.invites
      ADD CONSTRAINT invites_owner_account_id_fkey
      FOREIGN KEY (owner_account_id) REFERENCES public.owner_accounts(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping invites.owner_account_id (column missing)';
  END IF;
END $$;

-- ============================================================================
-- team_invitations.invited_by_user_id → ON DELETE SET NULL
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_invitations'
      AND column_name = 'invited_by_user_id'
  ) THEN
    UPDATE public.team_invitations ti
    SET invited_by_user_id = NULL
    WHERE ti.invited_by_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = ti.invited_by_user_id
      );

    ALTER TABLE public.team_invitations
      DROP CONSTRAINT IF EXISTS team_invitations_invited_by_user_id_fkey;

    ALTER TABLE public.team_invitations
      ADD CONSTRAINT team_invitations_invited_by_user_id_fkey
      FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'Skipping team_invitations.invited_by_user_id (column missing)';
  END IF;
END $$;

-- Verify the final state of all affected constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name  AS foreign_table,
  rc.delete_rule
FROM information_schema.table_constraints  AS tc
JOIN information_schema.key_column_usage   AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc  ON rc.constraint_name  = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'vendor_bookings', 'vendor_reviews', 'invites', 'service_items', 'intake_forms',
    'activity_log', 'client_profiles', 'team_invitations'
  )
ORDER BY tc.table_name, kcu.column_name;
