import { cookies } from 'next/headers';

/**
 * Cookie inspection and debugging utilities for authentication troubleshooting
 */

export const debugCookies = async (): Promise<{
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  cookieCount: number;
  supabaseCookieCount: number;
  allCookieNames: string[];
}> => {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  console.warn('=== COOKIE DEBUG ===');
  console.warn('Total cookies:', allCookies.length);

  const supabaseCookies = allCookies.filter(cookie =>
    cookie.name.startsWith('sb-')
  );

  console.warn(
    'Supabase cookies:',
    supabaseCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0,
    }))
  );

  return {
    hasAccessToken: supabaseCookies.some(c => c.name === 'sb-access-token'),
    hasRefreshToken: supabaseCookies.some(c => c.name === 'sb-refresh-token'),
    cookieCount: allCookies.length,
    supabaseCookieCount: supabaseCookies.length,
    allCookieNames: allCookies.map(c => c.name),
  };
};

export const validateCookieAttributes = (
  cookieName: string,
  cookieValue: string
): {
  valid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  if (!cookieValue) {
    issues.push('Empty cookie value');
  }

  if (cookieName === 'sb-access-token') {
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = cookieValue.split('.');
      if (parts.length !== 3) {
        issues.push('Invalid JWT format - missing parts');
        return { valid: false, issues };
      }

      // Use Buffer.from for base64 decoding instead of atob
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.exp && payload.exp < Date.now() / 1000) {
        issues.push('Access token expired');
      }
    } catch {
      issues.push('Invalid JWT format - parse error');
    }
  }

  return { valid: issues.length === 0, issues };
};

/**
 * Validate cookie size to prevent performance issues
 */
export const validateCookieSize = (
  name: string,
  value: string
): {
  valid: boolean;
  size: number;
  limit: number;
} => {
  const maxCookieSize = 4096; // bytes
  const totalSize = name.length + value.length;

  if (totalSize > maxCookieSize) {
    console.warn(`Cookie ${name} exceeds size limit: ${totalSize} bytes`);
    return { valid: false, size: totalSize, limit: maxCookieSize };
  }

  return { valid: true, size: totalSize, limit: maxCookieSize };
};

/**
 * Get detailed cookie analysis for troubleshooting
 */
export const analyzeCookies = async (): Promise<{
  total: number;
  supabase: {
    count: number;
    present: string[];
    missing: string[];
  };
  security: {
    httpOnlyCount: number;
    secureCount: number;
    sameSiteCount: number;
  };
  issues: string[];
}> => {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const analysis = {
    total: allCookies.length,
    supabase: {
      count: 0,
      present: [] as string[],
      missing: [] as string[],
    },
    security: {
      httpOnlyCount: 0,
      secureCount: 0,
      sameSiteCount: 0,
    },
    issues: [] as string[],
  };

  // Expected Supabase cookies
  const expectedCookies = ['sb-access-token', 'sb-refresh-token'];

  expectedCookies.forEach(expectedName => {
    const found = allCookies.find(c => c.name === expectedName);
    if (found) {
      analysis.supabase.present.push(expectedName);
      analysis.supabase.count++;

      // Validate the cookie
      const validation = validateCookieAttributes(expectedName, found.value);
      if (!validation.valid) {
        analysis.issues.push(
          `${expectedName}: ${validation.issues.join(', ')}`
        );
      }

      // Size validation
      const sizeCheck = validateCookieSize(expectedName, found.value);
      if (!sizeCheck.valid) {
        analysis.issues.push(
          `${expectedName}: Cookie too large (${sizeCheck.size} bytes)`
        );
      }
    } else {
      analysis.supabase.missing.push(expectedName);
    }
  });

  return analysis;
};
