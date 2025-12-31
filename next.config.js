/** @type {import('next').NextConfig} */

// Content Security Policy configuration
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://greenleafassurance.com;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'self';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim()

const securityHeaders = [
  // Content Security Policy - Comprehensive protection against XSS and injection attacks
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Prevent clickjacking (legacy browsers)
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  // Control referrer information sent with requests
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // HTTP Strict Transport Security - Force HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  // XSS Protection (legacy, but still useful for older browsers)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Permissions Policy - Restrict browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  // Cross-Origin policies for additional security
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin'
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin'
  }
]

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['greenleafassurance.com', 'images'],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig