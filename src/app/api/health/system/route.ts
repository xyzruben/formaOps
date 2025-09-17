import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/database/client';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';
import { queryCache } from '@/lib/cache/query-cache';
import {
  queryCircuitBreaker,
  databaseCircuitBreaker,
} from '@/lib/resilience/circuit-breaker';

/**
 * Comprehensive System Health Check Endpoint
 * GET /api/health/system
 *
 * Provides detailed system health including database, cache, circuit breakers,
 * and performance metrics for Phase 3 monitoring implementation
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Gather all health check data in parallel
    const [databaseHealth] = await Promise.all([
      checkDatabaseConnection().catch(error => ({
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })),
    ]);

    // Get performance metrics
    const systemMetrics = performanceMonitor.getSystemMetrics(1); // Last hour
    const performanceReport = performanceMonitor.generateReport(24); // Last 24 hours

    // Get cache statistics
    const cacheStats = queryCache.getStats();

    // Get circuit breaker status
    const circuitBreakerMetrics = {
      queryCircuitBreaker: queryCircuitBreaker.getMetrics(),
      databaseCircuitBreaker: databaseCircuitBreaker.getMetrics(),
    };

    // Calculate overall health score
    const healthScore = calculateHealthScore({
      database: databaseHealth.isHealthy,
      queryCircuitBreaker:
        circuitBreakerMetrics.queryCircuitBreaker.state === 'CLOSED',
      databaseCircuitBreaker:
        circuitBreakerMetrics.databaseCircuitBreaker.state === 'CLOSED',
      performanceMetrics: systemMetrics,
    });

    const responseTime = Date.now() - startTime;

    const healthStatus = {
      status:
        healthScore >= 80
          ? 'healthy'
          : healthScore >= 60
            ? 'degraded'
            : 'unhealthy',
      score: healthScore,
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,

      // Component health
      components: {
        database: {
          status: databaseHealth.isHealthy ? 'healthy' : 'unhealthy',
          latencyMs:
            'latencyMs' in databaseHealth
              ? databaseHealth.latencyMs
              : undefined,
          error: 'error' in databaseHealth ? databaseHealth.error : undefined,
        },

        cache: {
          status: 'healthy', // Cache failures are non-critical
          stats: {
            size: cacheStats.size,
            hitRate: Math.round(cacheStats.hitRate * 100) / 100,
            entries: cacheStats.entries.length,
          },
        },

        circuitBreakers: {
          status: Object.values(circuitBreakerMetrics).every(
            cb => cb.state === 'CLOSED'
          )
            ? 'healthy'
            : 'degraded',
          query: {
            state: circuitBreakerMetrics.queryCircuitBreaker.state,
            failures: circuitBreakerMetrics.queryCircuitBreaker.failures,
            failureRate:
              Math.round(
                circuitBreakerMetrics.queryCircuitBreaker.failureRate * 100
              ) / 100,
          },
          database: {
            state: circuitBreakerMetrics.databaseCircuitBreaker.state,
            failures: circuitBreakerMetrics.databaseCircuitBreaker.failures,
            failureRate:
              Math.round(
                circuitBreakerMetrics.databaseCircuitBreaker.failureRate * 100
              ) / 100,
          },
        },
      },

      // Performance metrics
      performance: {
        execution: {
          totalExecutions: systemMetrics.executionMetrics.totalExecutions,
          successRate:
            Math.round(systemMetrics.executionMetrics.successRate * 100) / 100,
          avgLatency: Math.round(systemMetrics.executionMetrics.avgLatency),
          p95Latency: Math.round(systemMetrics.executionMetrics.p95Latency),
        },
        ai: {
          avgTokensPerExecution: Math.round(
            systemMetrics.aiMetrics.avgTokensPerExecution
          ),
          avgCostPerExecution:
            Math.round(systemMetrics.aiMetrics.avgCostPerExecution * 10000) /
            10000,
          errorRate: Math.round(systemMetrics.aiMetrics.errorRate * 100) / 100,
        },
        validation: {
          totalValidations: systemMetrics.validationMetrics.totalValidations,
          successRate:
            Math.round(
              systemMetrics.validationMetrics.validationSuccessRate * 100
            ) / 100,
          avgTime: Math.round(
            systemMetrics.validationMetrics.avgValidationTime
          ),
        },
      },

      // Trends and alerts
      trends: performanceReport.trends.map(trend => ({
        metric: trend.metric,
        trend: trend.trend,
        change: Math.round(trend.change * 100) / 100,
      })),

      alerts: performanceReport.alerts.map(alert => ({
        severity: alert.threshold.severity,
        message: alert.threshold.message,
        currentValue: alert.currentValue,
        threshold: alert.threshold.threshold,
        triggeredAt: alert.triggeredAt.toISOString(),
      })),

      // Version and build info
      version: {
        api: '3.0.0',
        build: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || 'local',
        environment: process.env.NODE_ENV || 'unknown',
      },
    };

    // Determine HTTP status based on health
    const httpStatus = healthScore >= 80 ? 200 : healthScore >= 60 ? 206 : 503;

    return NextResponse.json(healthStatus, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('System Health Check Failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        status: 'error',
        score: 0,
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HEALTH_CHECK_ERROR',
        },
        version: {
          api: '3.0.0',
          build: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || 'local',
          environment: process.env.NODE_ENV || 'unknown',
        },
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

/**
 * Calculate overall health score based on component status
 */
function calculateHealthScore(components: {
  database: boolean;
  queryCircuitBreaker: boolean;
  databaseCircuitBreaker: boolean;
  performanceMetrics: any;
}): number {
  let score = 0;

  // Database health (40% weight)
  if (components.database) score += 40;

  // Circuit breaker health (20% weight)
  if (components.queryCircuitBreaker) score += 10;
  if (components.databaseCircuitBreaker) score += 10;

  // Performance metrics (40% weight)
  const perfMetrics = components.performanceMetrics;

  // Success rate component (20%)
  if (perfMetrics.executionMetrics.successRate >= 95) score += 20;
  else if (perfMetrics.executionMetrics.successRate >= 80) score += 15;
  else if (perfMetrics.executionMetrics.successRate >= 60) score += 10;

  // Latency component (20%)
  if (perfMetrics.executionMetrics.avgLatency <= 1000) score += 20;
  else if (perfMetrics.executionMetrics.avgLatency <= 3000) score += 15;
  else if (perfMetrics.executionMetrics.avgLatency <= 5000) score += 10;

  return Math.min(100, Math.max(0, score));
}
