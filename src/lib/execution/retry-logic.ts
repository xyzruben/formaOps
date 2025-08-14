export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
  retryableErrors: string[];
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
  lastAttemptError?: Error;
}

export interface RetryAttempt {
  attemptNumber: number;
  delayMs: number;
  error?: Error;
  timestamp: Date;
}

export class RetryManager {
  private readonly defaultConfig: RetryConfig = {
    maxAttempts: parseInt(process.env.RETRY_LIMIT || '3'),
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 100,
    retryableErrors: [
      'ECONNRESET',
      'ENOTFOUND', 
      'TIMEOUT',
      'RATE_LIMIT_EXCEEDED',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_ERROR',
      'AI_ERROR',
    ],
  };

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const attempts: RetryAttempt[] = [];
    let totalDelayMs = 0;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {

      try {
        const result = await operation();
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDelayMs,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        
        attempts.push({
          attemptNumber: attempt,
          delayMs: 0,
          error: err,
          timestamp: new Date(),
        });

        // Check if error is retryable
        if (!this.isRetryableError(err, finalConfig.retryableErrors)) {
          return {
            success: false,
            error: err,
            attempts: attempt,
            totalDelayMs,
            lastAttemptError: err,
          };
        }

        // Don't delay after the last attempt
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delayMs = this.calculateDelay(attempt, finalConfig);
        totalDelayMs += delayMs;

        // Update the attempt record with delay
        attempts[attempts.length - 1].delayMs = delayMs;

        // Wait before next attempt
        await this.sleep(delayMs);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxAttempts,
      totalDelayMs,
      lastAttemptError: lastError,
    };
  }

  public async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    _circuitConfig?: {
      failureThreshold?: number;
      recoveryTimeMs?: number;
      monitoringWindowMs?: number;
    }
  ): Promise<T> {
    // Simplified circuit breaker implementation
    // const config = {
    //   failureThreshold: 5,
    //   recoveryTimeMs: 60000,
    //   monitoringWindowMs: 300000, // 5 minutes
    //   ...circuitConfig,
    // };

    // In a real implementation, this would track failures across requests
    // For this simulation, we'll just check if the system is overloaded
    const systemLoad = this.getSystemLoad();
    
    if (systemLoad.isOverloaded) {
      throw new Error('Circuit breaker open - system overloaded');
    }

    return operation();
  }

  private isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toUpperCase();
    const errorName = error.name.toUpperCase();

    return retryableErrors.some(pattern => 
      errorMessage.includes(pattern) || 
      errorName.includes(pattern) ||
      errorMessage.includes(pattern.toUpperCase())
    );
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    const jitter = config.jitterMs ? Math.random() * config.jitterMs : 0;
    
    return Math.max(cappedDelay + jitter, 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getSystemLoad(): { isOverloaded: boolean; activeOperations: number } {
    // Simplified system load check
    // In a real system, this would check actual CPU, memory, etc.
    return {
      isOverloaded: false,
      activeOperations: 0,
    };
  }
}

// Predefined retry configurations for common scenarios
export const retryConfigs = {
  // Quick operations that should retry fast
  fast: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    jitterMs: 100,
  },

  // Standard retry for most operations
  standard: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterMs: 200,
  },

  // Aggressive retry for critical operations
  aggressive: {
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 1.5,
    jitterMs: 500,
  },

  // AI-specific retry (for AI API calls)
  ai: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    jitterMs: 1000,
    retryableErrors: [
      'RATE_LIMIT_EXCEEDED',
      'SERVICE_UNAVAILABLE', 
      'TIMEOUT',
      'INTERNAL_ERROR',
      'AI_ERROR',
      'ECONNRESET',
      'ENOTFOUND',
    ],
  },

  // Database operation retry
  database: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'CONNECTION_LOST',
      'DATABASE_ERROR',
      'TIMEOUT',
    ],
  },
} as const;

// Singleton instance
export const retryManager = new RetryManager();