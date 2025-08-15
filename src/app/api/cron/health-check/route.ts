import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { logger } from '@/lib/monitoring/logger';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// Health monitoring cron job
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron job authorization
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'default-cron-secret'}`;

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const healthChecks = {
    database: {
      status: 'unknown',
      responseTime: 0,
      error: null as string | null,
    },
    memory: { status: 'unknown', usage: 0, total: 0 },
    performance: {
      status: 'unknown',
      metrics: null as Record<string, unknown> | null,
    },
    errors: [] as string[],
  };

  try {
    // 1. Database health check
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1 as health_check`;
      healthChecks.database.responseTime = Date.now() - dbStart;
      healthChecks.database.status = 'healthy';

      // Check database connection pool
      const activeConnections = (await prisma.$queryRaw`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `) as Array<{ count: number }>;

      logger.info(
        `Database health check passed. Active connections: ${activeConnections[0]?.count || 'unknown'}`
      );
    } catch (error) {
      healthChecks.database.status = 'unhealthy';
      healthChecks.database.error = String(error);
      healthChecks.errors.push(`Database check failed: ${error}`);
      logger.error(`Database health check failed: ${error}`);
    }

    // 2. Memory usage check
    try {
      const memUsage = process.memoryUsage();
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      healthChecks.memory.usage = memUsedMB;
      healthChecks.memory.total = memTotalMB;

      // Alert if memory usage is high
      const memoryUsagePercent = (memUsedMB / memTotalMB) * 100;
      if (memoryUsagePercent > 80) {
        healthChecks.memory.status = 'warning';
        healthChecks.errors.push(
          `High memory usage: ${memoryUsagePercent.toFixed(1)}%`
        );
        logger.warn(
          `High memory usage: ${memUsedMB}MB/${memTotalMB}MB (${memoryUsagePercent.toFixed(1)}%)`
        );
      } else {
        healthChecks.memory.status = 'healthy';
      }

      // Record memory metrics
      performanceMonitor.recordMetric({
        name: 'memory_usage',
        value: memUsedMB,
        unit: 'bytes',
        timestamp: new Date(),
      });
    } catch (error) {
      healthChecks.memory.status = 'error';
      healthChecks.errors.push(`Memory check failed: ${error}`);
      logger.error(`Memory health check failed: ${error}`);
    }

    // 3. Performance metrics check
    try {
      const metrics = performanceMonitor.getSystemMetrics(1); // Last hour
      healthChecks.performance.metrics = metrics as unknown as Record<
        string,
        unknown
      >;

      // Check for performance issues
      if (metrics.executionMetrics.successRate < 95) {
        healthChecks.performance.status = 'warning';
        healthChecks.errors.push(
          `Low success rate: ${metrics.executionMetrics.successRate.toFixed(1)}%`
        );
        logger.warn(
          `Low execution success rate: ${metrics.executionMetrics.successRate.toFixed(1)}%`
        );
      } else if (metrics.executionMetrics.avgLatency > 5000) {
        healthChecks.performance.status = 'warning';
        healthChecks.errors.push(
          `High average latency: ${metrics.executionMetrics.avgLatency}ms`
        );
        logger.warn(
          `High average execution latency: ${metrics.executionMetrics.avgLatency}ms`
        );
      } else {
        healthChecks.performance.status = 'healthy';
      }
    } catch (error) {
      healthChecks.performance.status = 'error';
      healthChecks.errors.push(`Performance check failed: ${error}`);
      logger.error(`Performance health check failed: ${error}`);
    }

    // 4. Check for critical alerts
    try {
      const alerts = performanceMonitor.getActiveAlerts();
      if (alerts.length > 0) {
        healthChecks.errors.push(`Active alerts: ${alerts.length}`);
        alerts.forEach(alert => {
          logger.warn(`Alert: ${alert.threshold.message}`, {
            metric: alert.threshold.metric,
            currentValue: alert.currentValue,
            threshold: alert.threshold.threshold,
            severity: alert.threshold.severity,
          });
        });
      }
    } catch (error) {
      healthChecks.errors.push(`Alert check failed: ${error}`);
      logger.error(`Alert check failed: ${error}`);
    }

    // 5. Log system health summary
    const duration = Date.now() - startTime;
    const overallStatus =
      healthChecks.errors.length === 0 ? 'healthy' : 'degraded';

    logger.logSystemHealth({
      activeExecutions: 0, // Would be tracked by actual system monitor
      queuedExecutions: 0, // Would be tracked by actual system monitor
      cpuUtilization: 0, // Would be tracked by actual system monitor
      memoryUsage: healthChecks.memory.usage,
      healthStatus: overallStatus as 'healthy' | 'degraded' | 'overloaded',
    });

    // 6. Cleanup old performance metrics
    // This would be implemented based on your storage strategy

    const response = {
      success: true,
      status: overallStatus,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      checks: healthChecks,
      summary: {
        totalErrors: healthChecks.errors.length,
        databaseHealthy: healthChecks.database.status === 'healthy',
        memoryUsage: `${healthChecks.memory.usage}MB`,
        uptime: `${Math.round(process.uptime())}s`,
      },
    };

    logger.info(`Health check completed in ${duration}ms`, response.summary);

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = `Health check job failed: ${error}`;

    logger.error(errorMessage);

    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: errorMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        checks: healthChecks,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request);
}
