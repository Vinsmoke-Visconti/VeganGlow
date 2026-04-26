import { createBrowserClient } from './client';
import { createClient as createServerClient } from './server';

// Default export is the browser client for client components
export const supabase = typeof window !== 'undefined' ? createBrowserClient() : null;

// Export named helpers
export { createBrowserClient, createServerClient };
