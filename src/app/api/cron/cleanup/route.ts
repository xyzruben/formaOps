import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { logger } from '@/lib/monitoring/logger';

// Cleanup job for old data and maintenance tasks
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron job authorization
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'default-cron-secret'}`;
  
  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    executionsDeleted: 0,
    logsDeleted: 0,
    versionsDeleted: 0,
    errors: [] as string[],
  };

  try {
    logger.info('Starting cleanup job');

    // 1. Clean up old executions (older than 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    try {
      const deletedExecutions = await prisma.execution.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo,
          },
        },
      });
      results.executionsDeleted = deletedExecutions.count;
      logger.info(`Deleted ${deletedExecutions.count} old executions`);
    } catch (error) {
      const errorMessage = `Failed to delete old executions: ${error}`;
      results.errors.push(errorMessage);
      logger.error(errorMessage);
    }

    // 2. Clean up old execution logs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      const deletedLogs = await prisma.executionLog.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo,
          },
        },
      });
      results.logsDeleted = deletedLogs.count;
      logger.info(`Deleted ${deletedLogs.count} old execution logs`);
    } catch (error) {
      const errorMessage = `Failed to delete old logs: ${error}`;
      results.errors.push(errorMessage);
      logger.error(errorMessage);
    }

    // 3. Clean up old prompt versions (keep only last 10 versions per prompt)
    try {
      const prompts = await prisma.prompt.findMany({
        select: { id: true },
      });

      let totalVersionsDeleted = 0;

      for (const prompt of prompts) {
        // Get versions ordered by version number, keeping the latest 10
        const versionsToDelete = await prisma.promptVersion.findMany({
          where: { promptId: prompt.id },
          orderBy: { version: 'desc' },
          skip: 10, // Keep the latest 10 versions
        });

        if (versionsToDelete.length > 0) {
          const versionIds = versionsToDelete.map(v => v.id);
          const deleted = await prisma.promptVersion.deleteMany({
            where: {
              id: { in: versionIds },
            },
          });
          totalVersionsDeleted += deleted.count;
        }
      }

      results.versionsDeleted = totalVersionsDeleted;
      logger.info(`Deleted ${totalVersionsDeleted} old prompt versions`);
    } catch (error) {
      const errorMessage = `Failed to delete old prompt versions: ${error}`;
      results.errors.push(errorMessage);
      logger.error(errorMessage);
    }

    // 4. Database maintenance - analyze and vacuum (PostgreSQL specific)
    try {
      if (process.env.DATABASE_URL?.includes('postgresql')) {
        await prisma.$executeRaw`ANALYZE`;
        logger.info('Database analysis completed');
      }
    } catch (error) {
      const errorMessage = `Database maintenance failed: ${error}`;
      results.errors.push(errorMessage);
      logger.error(errorMessage);
    }

    const duration = Date.now() - startTime;
    logger.info(`Cleanup job completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = `Cleanup job failed: ${error}`;
    
    logger.error(errorMessage);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      duration: `${duration}ms`,
      results,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request);
}