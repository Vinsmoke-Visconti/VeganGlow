import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// createClient will still be called, but with placeholders if env vars are missing.
// This prevents the build from crashing during static page generation.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
