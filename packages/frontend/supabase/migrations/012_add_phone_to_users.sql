-- Add phone column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Comment for documentation
COMMENT ON COLUMN users.phone IS 'User phone number for SMS notifications';
