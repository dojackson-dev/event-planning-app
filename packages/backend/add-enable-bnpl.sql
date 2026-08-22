-- Add enable_bnpl flag to all account tables
-- Run in Supabase SQL editor

ALTER TABLE owner_accounts    ADD COLUMN IF NOT EXISTS enable_bnpl BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendor_accounts   ADD COLUMN IF NOT EXISTS enable_bnpl BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE artist_accounts   ADD COLUMN IF NOT EXISTS enable_bnpl BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE promoter_accounts ADD COLUMN IF NOT EXISTS enable_bnpl BOOLEAN NOT NULL DEFAULT FALSE;
