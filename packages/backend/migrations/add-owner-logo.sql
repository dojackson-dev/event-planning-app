-- Add logo_url to owner_accounts for venue branding
ALTER TABLE owner_accounts
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
