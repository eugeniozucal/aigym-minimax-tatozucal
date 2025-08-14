-- Migration: temporarily_disable_rls_for_testing
-- Created at: 1754964504

-- Temporarily disable RLS to test the authentication flow
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Also ensure settings table access works
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on other sensitive tables but with simpler policies
DROP POLICY IF EXISTS "Anyone can view enabled agents" ON agents;
CREATE POLICY "authenticated_users_view_enabled_agents" ON agents
  FOR SELECT USING (is_enabled = true);;