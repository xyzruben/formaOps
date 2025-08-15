import { prisma } from '../database/client';
import type { LogLevel } from '@prisma/client';

export interface LogEntry {
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  executionId?: string;
  userId?: string;
  category?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percent';
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export class Logger {
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  public async log(entry: LogEntry): Promise<void> {
    // Console logging for development
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] ${entry.level}:`;
      const suffix = entry.metadata
        ? `\n${JSON.stringify(entry.metadata, null, 2)}`
        : '';

      console.log(`${prefix} ${entry.message}${suffix}`);
    }

    // Database logging for execution-related logs
    if (entry.executionId) {
      try {
        await prisma.executionLog.create({
          data: {
            level: entry.level,
            message: entry.message,
            metadata: (entry.metadata || {}) as any,
            executionId: entry.executionId,
          },
        });
      } catch (error) {
        // Fallback to console if database logging fails
        console.error('Failed to log to database:', error);
        console.log(`[FALLBACK] ${entry.level}: ${entry.message}`);
      }
    }
  }

  public async debug(
    message: string,
    metadata?: Record<string, unknown>,
    executionId?: string
  ): Promise<void> {
    await this.log({ level: 'DEBUG', message, metadata, executionId });
  }

  public async info(
    message: string,
    metadata?: Record<string, unknown>,
    executionId?: string
  ): Promise<void> {
    await this.log({ level: 'INFO', message, metadata, executionId });
  }

  public async warn(
    message: string,
    metadata?: Record<string, unknown>,
    executionId?: string
  ): Promise<void> {
    await this.log({ level: 'WARN', message, metadata, executionId });
  }

  public async error(
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, unknown>,
    executionId?: string
  ): Promise<void> {
    const errorMetadata = {
      ...metadata,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    };

    await this.log({
      level: 'ERROR',
      message,
      metadata: errorMetadata,
      executionId,
    });
  }

  public async logPerformance(metric: PerformanceMetric): Promise<void> {
    await this.info(`Performance: ${metric.name}`, {
      performance: {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        timestamp: metric.timestamp || new Date(),
        ...metric.metadata,
      },
    });
  }

  public async logExecutionStart(
    executionId: string,
    data: {
      promptId: string;
      userId: string;
      inputs: Record<string, unknown>;
      priority: string;
      model?: string;
    }
  ): Promise<void> {
    await this.info(
      'Execution started',
      {
        execution: {
          phase: 'start',
          promptId: data.promptId,
          priority: data.priority,
          model: data.model,
          inputCount: Object.keys(data.inputs).length,
        },
      },
      executionId
    );
  }

  public async logExecutionComplete(
    executionId: string,
    data: {
      status: 'COMPLETED' | 'FAILED';
      latencyMs: number;
      tokenUsage?: {
        input: number;
        output: number;
        total: number;
      };
      costUsd?: number;
      validationStatus?: string;
      error?: string;
    }
  ): Promise<void> {
    const level = data.status === 'COMPLETED' ? 'INFO' : 'ERROR';
    const message = `Execution ${data.status.toLowerCase()}`;

    await this.log({
      level,
      message,
      metadata: {
        execution: {
          phase: 'complete',
          status: data.status,
          latencyMs: data.latencyMs,
          tokenUsage: data.tokenUsage,
          costUsd: data.costUsd,
          validationStatus: data.validationStatus,
          error: data.error,
        },
      },
      executionId,
    });
  }

  public async logValidation(
    executionId: string,
    data: {
      ruleCount: number;
      passedCount: number;
      failedCount: number;
      validationTimeMs: number;
      overallValid: boolean;
    }
  ): Promise<void> {
    await this.info(
      'Validation completed',
      {
        validation: {
          ruleCount: data.ruleCount,
          passedCount: data.passedCount,
          failedCount: data.failedCount,
          validationTimeMs: data.validationTimeMs,
          overallValid: data.overallValid,
          successRate:
            data.ruleCount > 0 ? (data.passedCount / data.ruleCount) * 100 : 0,
        },
      },
      executionId
    );
  }

  public async logSystemHealth(data: {
    activeExecutions: number;
    queuedExecutions: number;
    cpuUtilization: number;
    memoryUsage?: number;
    healthStatus: 'healthy' | 'degraded' | 'overloaded';
  }): Promise<void> {
    const level = data.healthStatus === 'healthy' ? 'INFO' : 'WARN';

    await this.log({
      level,
      message: `System health: ${data.healthStatus}`,
      metadata: {
        system: {
          activeExecutions: data.activeExecutions,
          queuedExecutions: data.queuedExecutions,
          cpuUtilization: data.cpuUtilization,
          memoryUsage: data.memoryUsage,
          healthStatus: data.healthStatus,
        },
      },
      category: 'system',
    });
  }

  public async getExecutionLogs(
    executionId: string,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      level: LogLevel;
      message: string;
      metadata: any;
      timestamp: Date;
    }>
  > {
    const logs = await prisma.executionLog.findMany({
      where: { executionId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs.map(log => ({
      id: log.id,
      level: log.level,
      message: log.message,
      metadata: log.metadata,
      timestamp: log.timestamp,
    }));
  }

  public async getSystemLogs(
    level?: LogLevel,
    category?: string,
    _limit = 100
  ): Promise<
    Array<{
      level: LogLevel;
      message: string;
      metadata: any;
      timestamp: Date;
    }>
  > {
    // For this portfolio implementation, we'll return mock system logs
    // In a real system, these would be stored in a separate system logs table
    return [
      {
        level: 'INFO' as LogLevel,
        message: 'System started successfully',
        metadata: { component: 'server' },
        timestamp: new Date(Date.now() - 60000),
      },
      {
        level: 'INFO' as LogLevel,
        message: 'Database connection established',
        metadata: { component: 'database' },
        timestamp: new Date(Date.now() - 50000),
      },
      {
        level: 'INFO' as LogLevel,
        message: 'AI service initialized',
        metadata: { component: 'ai-executor' },
        timestamp: new Date(Date.now() - 40000),
      },
    ];
  }
}

// Structured logging helpers
export const createExecutionLogger = (executionId: string) => {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) =>
      logger.debug(message, metadata, executionId),
    info: (message: string, metadata?: Record<string, unknown>) =>
      logger.info(message, metadata, executionId),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      logger.warn(message, metadata, executionId),
    error: (
      message: string,
      error?: Error | unknown,
      metadata?: Record<string, unknown>
    ) => logger.error(message, error, metadata, executionId),
  };
};

// Singleton instance
export const logger = new Logger();
