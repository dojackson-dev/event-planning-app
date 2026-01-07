-- Add 'security' role to user_role enum
-- This must be run BEFORE enhance-guest-lists-for-doorlist.sql
-- Run this migration first, then run the main door list migration

-- Add 'security' role to user_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'user_role' AND e.enumlabel = 'security'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'security';
    RAISE NOTICE 'Added security role to user_role enum';
  ELSE
    RAISE NOTICE 'Security role already exists in user_role enum';
  END IF;
END $$;

-- Verify the role was added
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumlabel;
