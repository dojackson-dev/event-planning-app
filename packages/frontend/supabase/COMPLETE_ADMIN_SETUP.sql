-- =================================================================
-- COMPLETE ADMIN SETUP - Run this entire script in Supabase SQL Editor
-- =================================================================

-- 1. Add custom_url to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_url VARCHAR(255);

-- 2. Add admin role to user_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'admin') THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END $$;

-- 3. Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Service role can insert users" ON users;

-- 5. Create new RLS policies
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to read all users (CHECK FIRST - recursive query)
CREATE POLICY "Admins can read all users"
ON users FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- Allow admins to update any user
CREATE POLICY "Admins can update all users"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- 6. Create trigger for auto-creating user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role),
    (NEW.raw_user_meta_data->>'tenant_id')::uuid
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Create website_configs table
CREATE TABLE IF NOT EXISTS website_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme_color VARCHAR(7) DEFAULT '#3b82f6',
  logo_url VARCHAR(500),
  hero_title VARCHAR(255) NOT NULL,
  hero_subtitle TEXT,
  about_text TEXT,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  address TEXT,
  show_booking_form BOOLEAN DEFAULT true,
  show_gallery BOOLEAN DEFAULT true,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_website_configs_tenant_id ON website_configs(tenant_id);

-- 8. Manually insert your admin user
-- IMPORTANT: Replace with your actual email!
INSERT INTO users (id, email, first_name, last_name, role, tenant_id)
VALUES (
  '2fbe92e3-3275-459a-9a26-00c526cd69db',
  'admin@dovenuesuites.com',  -- CHANGE THIS TO YOUR EMAIL
  'Larry',
  'Admin',
  'admin',
  NULL
)
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- Done! You should now be able to login at /admin/login
