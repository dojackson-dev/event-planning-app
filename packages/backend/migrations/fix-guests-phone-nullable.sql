-- Fix: guests.phone column should be nullable (phone is optional when adding a guest)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

ALTER TABLE guests ALTER COLUMN phone DROP NOT NULL;
