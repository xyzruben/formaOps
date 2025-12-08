/**
 * Client-Side CSRF Token Utilities
 *
 * Section 7.1: security_dog.md - CSRF token protection for API requests
 *
 * Usage in client components:
 * ```typescript
 * import { getCsrfToken, fetchWithCsrf } from '@/lib/utils/csrf-client';
 *
 * // Option 1: Use the fetch wrapper
 * const response = await fetchWithCsrf('/api/prompts', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 *
 * // Option 2: Manually add CSRF token
 * const token = getCsrfToken();
 * fetch('/api/prompts', {
 *   method: 'POST',
 *   headers: { 'X-CSRF-Token': token },
 *   body: JSON.stringify(data),
 * });
 * ```
 */

/**
 * Get CSRF token from cookie
 * The token is set by the middleware in a readable (non-httpOnly) cookie
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    // Server-side rendering, no cookies available
    return null;
  }

  const cookies = document.cookie.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith('csrf-token='));

  if (!csrfCookie) {
    console.warn(
      '[CSRF] No CSRF token found in cookies. Make sure middleware is running.'
    );
    return null;
  }

  return csrfCookie.split('=')[1] || null;
}

/**
 * Fetch wrapper that automatically includes CSRF token for state-changing requests
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Promise that resolves to the Response
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const requiresToken = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (requiresToken) {
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
      throw new Error(
        'CSRF token not found. Unable to make authenticated request.'
      );
    }

    // Add CSRF token to headers
    const headers = new Headers(options.headers);
    headers.set('X-CSRF-Token', csrfToken);

    options.headers = headers;
  }

  return fetch(url, options);
}

/**
 * Check if CSRF token is available
 * Useful for conditionally rendering UI or showing errors
 */
export function hasCsrfToken(): boolean {
  return getCsrfToken() !== null;
}

/**
 * Wait for CSRF token to be available (useful on initial page load)
 * Times out after maxWaitMs
 */
export async function waitForCsrfToken(
  maxWaitMs: number = 5000
): Promise<string | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const token = getCsrfToken();
    if (token) {
      return token;
    }
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.error('[CSRF] Timeout waiting for CSRF token');
  return null;
}
