-- Add cover_image_url to owner_accounts for venue branding banner
ALTER TABLE owner_accounts
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
