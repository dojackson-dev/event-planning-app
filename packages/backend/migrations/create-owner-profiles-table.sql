-- Create owner_profiles table
CREATE TABLE IF NOT EXISTS owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal info
  first_name TEXT,
  last_name TEXT,
  
  -- Company info
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  company_phone TEXT NOT NULL,
  company_address TEXT,
  company_city TEXT,
  company_state TEXT,
  company_zip TEXT,
  business_type TEXT,
  
  -- Facility info
  number_of_facilities INTEGER DEFAULT 1,
  facilities_data JSONB DEFAULT '[]'::jsonb,
  
  -- Account status
  status TEXT DEFAULT 'pending_payment',
  payment_status TEXT DEFAULT 'pending',
  activated_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),
  UNIQUE(company_email)
);

-- Enable RLS
ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;

-- Owners can read their own profile
CREATE POLICY "Owners can read own profile"
  ON owner_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Owners can update their own profile
CREATE POLICY "Owners can update own profile"
  ON owner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Owners can insert their own profile
CREATE POLICY "Owners can insert own profile"
  ON owner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for user_id lookups
CREATE INDEX owner_profiles_user_id_idx ON owner_profiles(user_id);
