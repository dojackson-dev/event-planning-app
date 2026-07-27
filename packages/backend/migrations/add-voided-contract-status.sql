-- Add 'voided' value to contract_status enum
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql

ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'voided';
