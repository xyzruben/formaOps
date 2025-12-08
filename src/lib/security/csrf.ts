/**
 * CSRF (Cross-Site Request Forgery) Token Protection
 *
 * Section 7.1: security_dog.md - CSRF token protection for state-changing operations
 *
 * While SameSite cookies provide some protection, CSRF tokens add an additional
 * layer of security, especially for:
 * - Legacy browsers that don't support SameSite
 * - Defense in depth approach
 * - Protection against sophisticated CSRF attacks that can bypass SameSite
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token from request against cookie value
 *
 * @param tokenFromHeader - CSRF token from X-CSRF-Token header
 * @param tokenFromCookie - CSRF token from csrf-token cookie
 * @returns true if tokens match, false otherwise
 */
export function validateCsrfToken(
  tokenFromHeader: string | null,
  tokenFromCookie: string | null
): boolean {
  // Both tokens must be present
  if (!tokenFromHeader || !tokenFromCookie) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(tokenFromHeader),
      Buffer.from(tokenFromCookie)
    );
  } catch {
    // If buffers are different lengths, timingSafeEqual throws
    return false;
  }
}

/**
 * Check if a request method requires CSRF protection
 * GET, HEAD, and OPTIONS are considered safe methods
 */
export function requiresCsrfProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Extract CSRF token from request headers
 */
export function getCsrfTokenFromHeader(request: Request): string | null {
  return request.headers.get('X-CSRF-Token');
}

/**
 * Extract CSRF token from cookies
 */
export function getCsrfTokenFromCookie(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith('csrf-token='));

  if (!csrfCookie) return null;

  return csrfCookie.split('=')[1] || null;
}
