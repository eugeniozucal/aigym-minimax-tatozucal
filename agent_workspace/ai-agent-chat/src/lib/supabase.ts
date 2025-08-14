import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/types'

const supabaseUrl = 'https://hfqcbataezzfgavidhbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWNiYXRhZXp6ZmdhdmlkaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTk4NjksImV4cCI6MjA3MDUzNTg2OX0.vPzsikPkgLBKoPnDPiGY-y6dZRdgaHc2Ml4JjxL-Kl0'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Type helpers
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']