-- Migration: enable_rls_on_profiles_table
-- Created at: 1754966802

-- Enable Row Level Security on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;;