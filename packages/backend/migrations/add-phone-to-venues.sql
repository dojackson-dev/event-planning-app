-- Add missing phone column to venues table
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'venues' AND column_name = 'phone';
