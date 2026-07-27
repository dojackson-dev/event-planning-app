-- ================================================================
-- ADD MISSING IMAGE COLUMNS TO promoter_accounts
-- ================================================================
-- Run if promoter_accounts table was created before these columns
-- were added to the schema (CREATE TABLE IF NOT EXISTS skips new
-- columns when the table already exists).
-- ================================================================

ALTER TABLE promoter_accounts ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE promoter_accounts ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
