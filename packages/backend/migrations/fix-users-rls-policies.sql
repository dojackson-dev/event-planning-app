-- Fix infinite recursion in users table RLS policies
-- This happens when policies query the users table itself
-- Run this in Supabase SQL Editor

-- First, let's see what policies exist on users table
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- The problem is likely a policy that does something like:
-- (SELECT role FROM users WHERE id = auth.uid())
-- This creates infinite recursion because checking the policy requires querying users,
-- which triggers the policy again.

-- Drop ALL 13 existing RLS policies on users table
-- These include 3 problematic ones causing infinite recursion:
-- 1. "Admins can read all users" - EXISTS (SELECT FROM users...)
-- 2. "Admins can update all users" - EXISTS (SELECT FROM users...)
-- 3. "Users can view users in their tenant" - SELECT FROM users...

DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;

-- Create NEW policies that DON'T query the users table
-- Instead, use auth.uid() and auth.jwt() directly

-- Allow users to view their own data
CREATE POLICY "Users can view their own data"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow users to update their own data (except role)
CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow admins to view all users (using JWT claim, not querying users table)
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (auth.jwt()->>'role' = 'admin');

-- Allow admins to update any user (using JWT claim, not querying users table)
CREATE POLICY "Admins can update users"
ON users FOR UPDATE
TO authenticated
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Allow user creation during signup
CREATE POLICY "Allow user creation"
ON users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- CRITICAL: Now reload the schema so Supabase recognizes everything
NOTIFY pgrst, 'reload schema';
