// Legacy compatibility shim — re-exports the typed App Router supabase client
// so that legacy-pages JS imports still resolve. All new code should import
// directly from '@/lib/supabase/client' or '@/lib/supabase/server'.
export { supabase, createBrowserClient, createServerClient } from './supabase/index';
