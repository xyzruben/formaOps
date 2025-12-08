/**
 * Distributed Rate Limiting with Upstash Redis
 *
 * Section 2.2: security_dog.md - Replace in-memory rate limiting with distributed solution
 *
 * This implementation uses Upstash Redis for serverless-compatible rate limiting
 * that works across multiple edge instances and supports horizontal scaling.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limit configuration per endpoint
export const RATE_LIMIT_CONFIG = {
  '/api/auth/login': { limit: 50, window: '15 m' }, // 50 attempts per 15 minutes
  '/api/auth/register': { limit: 20, window: '15 m' }, // 20 registration attempts per 15 minutes
  '/api/executions': { limit: 1000, window: '1 h' }, // 1000 read requests per hour
  '/api/prompts/[id]/execute': { limit: 50, window: '1 h' }, // 50 prompt executions per hour
  '/api/prompts': { limit: 1000, window: '1 h' }, // 1000 read requests per hour
  default: { limit: 500, window: '1 h' }, // 500 requests per hour default
} as const;

type RateLimitConfig = {
  limit: number;
  window: '15 m' | '1 h';
};

/**
 * Get rate limit configuration for a given pathname
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const [path, config] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config;
    }
  }
  return RATE_LIMIT_CONFIG.default;
}

/**
 * Create or get Redis client for rate limiting
 * Falls back to in-memory rate limiting if Redis is not configured
 */
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // If Redis is not configured, return null to use fallback
  if (!url || !token) {
    console.warn(
      '[Rate Limit] Upstash Redis not configured. Using in-memory fallback (not production-safe).'
    );
    return null;
  }

  redis = new Redis({
    url,
    token,
  });

  return redis;
}

/**
 * In-memory fallback for development when Redis is not configured
 * WARNING: This is NOT production-safe in serverless environments
 */
const inMemoryRateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>();

function inMemoryRateLimit(
  clientId: string,
  config: RateLimitConfig
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = config.window === '15 m' ? 15 * 60 * 1000 : 60 * 60 * 1000;
  const clientData = inMemoryRateLimitMap.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    const resetTime = now + windowMs;
    inMemoryRateLimitMap.set(clientId, { count: 1, resetTime });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: resetTime,
    };
  }

  if (clientData.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: clientData.resetTime,
    };
  }

  clientData.count++;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - clientData.count,
    reset: clientData.resetTime,
  };
}

// Cleanup old in-memory rate limit entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, data] of inMemoryRateLimitMap.entries()) {
      if (now > data.resetTime) {
        inMemoryRateLimitMap.delete(key);
      }
    }
  },
  10 * 60 * 1000
);

/**
 * Check if a request should be rate limited
 *
 * @param clientId - Unique identifier for the client (IP + user agent)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status, limits, and reset time
 */
export async function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const redisClient = getRedisClient();

  // Fall back to in-memory if Redis is not configured
  if (!redisClient) {
    return inMemoryRateLimit(clientId, config);
  }

  // Use Upstash Ratelimit with sliding window algorithm
  const ratelimit = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    analytics: true,
    prefix: 'formaops:ratelimit',
  });

  try {
    const result = await ratelimit.limit(clientId);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // If Redis fails, log error and allow request (fail open for availability)
    console.error('[Rate Limit] Redis error:', error);
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + 60 * 60 * 1000,
    };
  }
}

/**
 * Get client identifier for rate limiting
 * Combines IP address and user agent for better identification
 */
export function getClientId(request: Request): string {
  const headers = request.headers;

  // Get IP address
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  // Add user agent for better identification (optional)
  const userAgent = headers.get('user-agent') || 'unknown';

  return `${ip}:${userAgent.substring(0, 50)}`;
}
