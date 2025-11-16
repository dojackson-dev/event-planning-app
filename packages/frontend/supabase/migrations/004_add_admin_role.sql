-- Add 'admin' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- This allows admin users to manage the entire system
COMMENT ON TYPE user_role IS 'User roles: customer, owner, planner, admin';
