// Edge Function: Shared CORS headers
// Used by all Supabase Edge Functions
//
// Set ALLOWED_ORIGINS as comma-separated list in Supabase Function secrets,
// e.g.  https://veganglow.vn,https://veganglow.vercel.app
// If unset, falls back to "*" (development only).

const allowList = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowOrigin =
    allowList.length === 0 ? '*' : allowList.includes(origin) ? origin : allowList[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    Vary: 'Origin',
  };
}

// Backwards-compat: existing functions import { corsHeaders }
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': allowList.length === 0 ? '*' : allowList[0],
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  Vary: 'Origin',
};
