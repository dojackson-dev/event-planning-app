-- Force PostgREST schema cache reload
-- Run this in Supabase SQL Editor to completely refresh the schema cache
-- This fixes PGRST204 errors where PostgREST can't find columns that exist

-- Method 1: Send reload notification
NOTIFY pgrst, 'reload schema';

-- Method 2: Force a schema change that PostgREST must detect
-- Create and drop a dummy function to trigger cache invalidation
CREATE OR REPLACE FUNCTION public.force_schema_reload_trigger()
RETURNS void
LANGUAGE sql
AS $$
  SELECT 1;
$$;

DROP FUNCTION IF EXISTS public.force_schema_reload_trigger();

-- Method 3: Verify the intake_forms table structure
-- This will show you what columns actually exist vs what PostgREST thinks exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'intake_forms'
ORDER BY ordinal_position;

-- After running this, restart your Supabase project:
-- 1. Go to Supabase Dashboard > Project Settings
-- 2. Click "Pause Project"
-- 3. Wait 30 seconds
-- 4. Click "Resume Project"
-- 5. Wait for project to fully start (2-3 minutes)
