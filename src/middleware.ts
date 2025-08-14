import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  '/api/auth/login': { limit: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  '/api/executions': { limit: 50, window: 60 * 60 * 1000 }, // 50 executions per hour
  '/api/prompts': { limit: 100, window: 60 * 60 * 1000 }, // 100 requests per hour
  default: { limit: 200, window: 60 * 60 * 1000 }, // 200 requests per hour default
};

function getRateLimit(pathname: string): { limit: number; window: number } {
  for (const [path, config] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config;
    }
  }
  return RATE_LIMIT_CONFIG.default;
}

function getClientId(request: NextRequest): string {
  // In production, consider using multiple factors for client identification
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // Add user agent for better identification (optional)
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return `${ip}:${userAgent.substring(0, 50)}`;
}

function isRateLimited(clientId: string, config: { limit: number; window: number }): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    rateLimitMap.set(clientId, { count: 1, resetTime: now + config.window });
    return false;
  }
  
  if (clientData.count >= config.limit) {
    return true;
  }
  
  clientData.count++;
  return false;
}

function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup old rate limit entries every 10 minutes
setInterval(cleanupRateLimit, 10 * 60 * 1000);

export function middleware(request: NextRequest): NextResponse {
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
  
  // Security checks
  const response = NextResponse.next();
  
  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // CORS for API routes
  if (pathname.startsWith('/api/')) {
    // Rate limiting for API routes
    const clientId = getClientId(request);
    const rateLimit = getRateLimit(pathname);
    
    if (isRateLimited(clientId, rateLimit)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again later.`,
          retryAfter: Math.ceil(rateLimit.window / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(rateLimit.window / 1000).toString(),
            ...securityHeaders,
          },
        }
      );
    }
    
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
  
  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://api.openai.com https://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();
  
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // Additional security for production
  if (process.env.NODE_ENV === 'production') {
    // Block common attack patterns
    const suspiciousPatterns = [
      /\.\.\//,  // Path traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /javascript:/i,  // Javascript protocol
      /vbscript:/i,  // VBScript protocol
    ];
    
    const url = request.url;
    const hasUserInput = request.nextUrl.searchParams.toString() || 
                        request.headers.get('referer') || '';
    
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
    
    const isSuspicious = suspiciousUserAgents.some(pattern => pattern.test(userAgent));
    const isLegitimate = legitimateBots.some(pattern => pattern.test(userAgent));
    
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
    
    console.log('Request:', JSON.stringify(requestInfo));
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