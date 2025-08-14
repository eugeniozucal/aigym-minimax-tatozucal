-- Migration: temporarily_disable_rls_debug_admin
-- Created at: 1754967315

-- Temporarily disable RLS for debugging admin profile loading
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;;