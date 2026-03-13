-- Add 'vendor' role to user_role enum
-- Run this migration BEFORE or alongside add-vendors.sql
-- Required for vendor signup to work (auth-flow.service.ts sets role = 'vendor')

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'user_role' AND e.enumlabel = 'vendor'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'vendor';
    RAISE NOTICE 'Added vendor role to user_role enum';
  ELSE
    RAISE NOTICE 'Vendor role already exists in user_role enum';
  END IF;
END $$;

-- Verify all roles
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumlabel;
