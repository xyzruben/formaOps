import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';

/**
 * Database Health Check Endpoint
 * GET /api/health/database
 *
 * Provides real-time database connectivity and performance metrics
 * for diagnosing API_PROMPTS_500_ERROR issues
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Test basic connection with a simple query
    await prisma.$queryRaw`SELECT 1 as health_check`;

    const responseTime = Date.now() - startTime;

    // Additional connection pool status (if available)
    let connectionInfo = {};
    try {
      // Test a typical query similar to getUserPrompts to verify full functionality
      const testQuery = await prisma.user.findFirst({
        select: { id: true },
        where: { email: { not: null } },
      });

      connectionInfo = {
        queryTest: 'passed',
        testResult: testQuery ? 'user_found' : 'no_users',
      };
    } catch (queryError) {
      connectionInfo = {
        queryTest: 'failed',
        queryError:
          queryError instanceof Error
            ? queryError.message
            : 'Unknown query error',
      };
    }

    return NextResponse.json(
      {
        status: 'healthy',
        database: {
          connected: true,
          responseTimeMs: responseTime,
          ...connectionInfo,
        },
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Detailed error logging for database issues
    console.error('Database Health Check Failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString(),
      code: (error as any)?.code,
      type: error?.constructor?.name,
    });

    const errorCode = (error as any)?.code;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Categorize the database error
    let errorCategory = 'unknown';
    let troubleshooting =
      'Check database configuration and network connectivity';

    if (errorCode === 'P1001' || errorMessage.includes('connection')) {
      errorCategory = 'connection_failed';
      troubleshooting =
        'Database connection failed. Check DATABASE_URL and network connectivity.';
    } else if (errorMessage.includes('timeout')) {
      errorCategory = 'timeout';
      troubleshooting =
        'Database query timeout. Check database performance and connection pool settings.';
    } else if (typeof errorCode === 'string' && errorCode.startsWith('P')) {
      errorCategory = 'prisma_error';
      troubleshooting = `Prisma error ${errorCode}. Check database schema and permissions.`;
    } else if (
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED')
    ) {
      errorCategory = 'network_error';
      troubleshooting =
        'Network connectivity issue. Check database host and port configuration.';
    }

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: {
          connected: false,
          responseTimeMs: responseTime,
          error: {
            message: errorMessage,
            code: errorCode,
            category: errorCategory,
            troubleshooting: troubleshooting,
          },
        },
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
