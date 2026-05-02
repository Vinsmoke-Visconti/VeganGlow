/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

const baseSecurityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
  },
];

if (isProd) {
  baseSecurityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

// Storefront CSP — currently in REPORT-ONLY mode by default. Flip
// FEATURE_CSP_ENFORCE=true once Sentry violation reports are clean.
// Uses 'unsafe-inline' for scripts during phased rollout; will be tightened
// to hash-based once Next 16 build manifest hash extraction is wired up.
const storefrontCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://ui-avatars.com https://img.vietqr.io",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const cspHeaderName =
  process.env.FEATURE_CSP_ENFORCE === 'true'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.56.1'],
  devIndicators: {
    appIsrStatus: false,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'img.vietqr.io' },
    ],
  },

  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'VeganGlow',
  },

  trailingSlash: false,
  output: 'standalone',

  async headers() {
    return [
      {
        // Apply to everything except /admin (admin CSP is set per-request in middleware
        // with a fresh nonce) and /api/auth/ping (lightweight, no body).
        source: '/((?!admin|api/auth/ping).*)',
        headers: [
          ...baseSecurityHeaders,
          { key: cspHeaderName, value: storefrontCSP },
        ],
      },
    ];
  },
};

export default nextConfig;
