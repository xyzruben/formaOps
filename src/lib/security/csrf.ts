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

/**
 * Generate a cryptographically secure CSRF token
 * Uses Web Crypto API for Edge Runtime compatibility
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('hex');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Edge Runtime compatible implementation
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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
  return timingSafeEqual(tokenFromHeader, tokenFromCookie);
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
