-- Migration: fix_rls_policies
-- Created at: 1754964330

-- Drop all existing policies and recreate them correctly
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles; 
DROP POLICY IF EXISTS "Service role bypass" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Profiles can be inserted by triggers" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create simple, working policies
-- Allow users to view their own profile
CREATE POLICY "users_select_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile  
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow profile creation (for triggers and signup)
CREATE POLICY "enable_profile_creation" ON profiles
  FOR INSERT WITH CHECK (true);

-- Allow service role full access (for edge functions)
CREATE POLICY "service_role_all_access" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');;