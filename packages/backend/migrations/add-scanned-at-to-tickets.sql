-- Migration: Add scanned_at column to tickets table
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;
