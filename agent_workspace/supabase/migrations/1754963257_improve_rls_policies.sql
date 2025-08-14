-- Migration: improve_rls_policies
-- Created at: 1754963257

-- Add more permissive policies for better functionality
-- Allow service role to bypass RLS for edge functions
CREATE POLICY "Service role bypass" ON profiles
  FOR ALL USING (current_setting('role') = 'service_role') 
  WITH CHECK (current_setting('role') = 'service_role');

-- Allow authenticated users to read public settings
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read enabled agents
CREATE POLICY "Allow authenticated users to view enabled agents" ON agents
  FOR SELECT USING (auth.role() = 'authenticated' AND is_enabled = true);

-- Ensure users can read their profile after creation
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');

-- Allow profile creation for authenticated users (needed for trigger)
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT WITH CHECK (true);;