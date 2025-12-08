import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkRateLimit,
  getClientId,
  getRateLimitConfig,
} from '@/lib/security/rate-limit';
import {
  generateCsrfToken,
  validateCsrfToken,
  requiresCsrfProtection,
  getCsrfTokenFromHeader,
  getCsrfTokenFromCookie,
} from '@/lib/security/csrf';

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and certain paths
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Generate nonce for CSP (Section 2.3: security_dog.md)
  // Use Web Crypto API for Edge Runtime compatibility
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(16))
  ).toString('base64');

  // Security checks
  const response = NextResponse.next();

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS for API routes
  if (pathname.startsWith('/api/')) {
    // CSRF Token Protection (Section 7.1: security_dog.md)
    // Validate CSRF tokens on state-changing operations
    if (requiresCsrfProtection(request.method)) {
      const tokenFromHeader = getCsrfTokenFromHeader(request);
      const tokenFromCookie = getCsrfTokenFromCookie(
        request.headers.get('cookie')
      );

      if (!validateCsrfToken(tokenFromHeader, tokenFromCookie)) {
        return new NextResponse(
          JSON.stringify({
            error: 'CSRF validation failed',
            message: 'Invalid or missing CSRF token',
            code: 'CSRF_VALIDATION_FAILED',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...securityHeaders,
            },
          }
        );
      }
    }

    // Rate limiting for API routes (Section 2.2: security_dog.md - Distributed rate limiting)
    const clientId = getClientId(request);
    const rateLimitConfig = getRateLimitConfig(pathname);

    const { success, limit, remaining, reset } = await checkRateLimit(
      clientId,
      rateLimitConfig
    );

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again later.`,
          limit,
          remaining: 0,
          reset,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': retryAfter.toString(),
            ...securityHeaders,
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    // CORS headers
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }

  // Content Security Policy (Section 2.3: security_dog.md - nonce-based CSP)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://va.vercel-scripts.com;
    style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://api.openai.com https://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  // Pass nonce to the app via response header for inline scripts/styles
  response.headers.set('X-Nonce', nonce);

  // Additional security for production
  if (process.env.NODE_ENV === 'production') {
    // Block common attack patterns
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // Javascript protocol
      /vbscript:/i, // VBScript protocol
    ];

    const url = request.url;
    const hasUserInput =
      request.nextUrl.searchParams.toString() ||
      request.headers.get('referer') ||
      '';

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(hasUserInput)) {
        return new NextResponse('Blocked', {
          status: 403,
          headers: securityHeaders,
        });
      }
    }

    // Block requests with suspicious user agents
    const userAgent = request.headers.get('user-agent') || '';
    const suspiciousUserAgents = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /wget/i,
      /curl/i,
    ];

    // Allow legitimate bots (optional - comment out if you want to block all bots)
    const legitimateBots = [
      /googlebot/i,
      /bingbot/i,
      /slackbot/i,
      /twitterbot/i,
      /facebookexternalhit/i,
    ];

    const isSuspicious = suspiciousUserAgents.some(pattern =>
      pattern.test(userAgent)
    );
    const isLegitimate = legitimateBots.some(pattern =>
      pattern.test(userAgent)
    );

    if (isSuspicious && !isLegitimate && pathname.startsWith('/api/')) {
      return new NextResponse('Blocked', {
        status: 403,
        headers: securityHeaders,
      });
    }
  }

  // Request logging for monitoring
  if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
    const requestInfo = {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: getClientId(request),
      timestamp: new Date().toISOString(),
    };

    // eslint-disable-next-line no-console
    console.log('Request:', JSON.stringify(requestInfo));
  }

  // Set CSRF token cookie (Section 7.1: security_dog.md)
  // Check if CSRF token already exists in cookies
  const existingCsrfToken = getCsrfTokenFromCookie(
    request.headers.get('cookie')
  );

  if (!existingCsrfToken) {
    // Generate new CSRF token if none exists
    const csrfToken = generateCsrfToken();

    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
