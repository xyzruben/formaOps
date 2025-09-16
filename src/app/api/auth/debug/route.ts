import { NextResponse } from 'next/server';
import { debugCookies, analyzeCookies } from '@/lib/auth/debug';
import { getUser } from '@/lib/auth/server';

/**
 * Authentication Debug Endpoint
 * GET /api/auth/debug
 *
 * Provides comprehensive session and cookie information for troubleshooting
 * authentication issues. Only available in development and test environments.
 */
export async function GET(): Promise<NextResponse> {
  // Security: Only allow debug endpoint in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 404 }
    );
  }

  try {
    // Get cookie debug info
    const cookieDebug = await debugCookies();
    const cookieAnalysis = await analyzeCookies();

    // Get user authentication status
    let user = null;
    let authError = null;

    try {
      user = await getUser();
    } catch (error) {
      authError = error instanceof Error ? error.message : 'Unknown auth error';
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isProduction: process.env.NODE_ENV === 'production',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? 'Set'
          : 'Missing',
      },
      authentication: {
        authenticated: !!user,
        user: user
          ? {
              id: user.id,
              email: user.email,
              lastSignIn: user.last_sign_in_at,
              emailConfirmed: user.email_confirmed_at,
            }
          : null,
        error: authError,
      },
      cookies: {
        debug: cookieDebug,
        analysis: cookieAnalysis,
      },
      recommendations: generateRecommendations(
        cookieAnalysis,
        !!user,
        authError
      ),
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    console.error('Debug endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Generate troubleshooting recommendations based on debug data
 */
function generateRecommendations(
  cookieAnalysis: {
    supabase: {
      count: number;
      present: string[];
      missing: string[];
    };
    issues: string[];
  },
  isAuthenticated: boolean,
  authError: string | null
): string[] {
  const recommendations: string[] = [];

  // Check for missing cookies
  if (cookieAnalysis.supabase.missing.includes('sb-access-token')) {
    recommendations.push(
      'CRITICAL: Missing sb-access-token cookie. Check login API cookie setting.'
    );
  }

  if (cookieAnalysis.supabase.missing.includes('sb-refresh-token')) {
    recommendations.push(
      'WARNING: Missing sb-refresh-token cookie. Session may not persist.'
    );
  }

  // Check authentication status vs cookie presence
  if (!isAuthenticated && cookieAnalysis.supabase.count > 0) {
    recommendations.push(
      'ISSUE: Cookies present but authentication failed. Check cookie validation.'
    );
  }

  if (isAuthenticated && cookieAnalysis.supabase.count === 0) {
    recommendations.push(
      'UNUSUAL: Authenticated without Supabase cookies. Check auth flow.'
    );
  }

  // Check for cookie issues
  if (cookieAnalysis.issues.length > 0) {
    recommendations.push(`COOKIE ISSUES: ${cookieAnalysis.issues.join(', ')}`);
  }

  // Authentication error guidance
  if (authError) {
    if (authError.includes('Authentication required')) {
      recommendations.push(
        'AUTH ERROR: No valid session found. User may need to log in again.'
      );
    } else {
      recommendations.push(
        `AUTH ERROR: ${authError}. Check server logs for details.`
      );
    }
  }

  // Success case
  if (
    isAuthenticated &&
    cookieAnalysis.supabase.count > 0 &&
    cookieAnalysis.issues.length === 0
  ) {
    recommendations.push('✅ Authentication working correctly!');
  }

  return recommendations;
}
