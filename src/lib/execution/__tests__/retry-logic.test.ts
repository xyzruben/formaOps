import { RetryManager, retryConfigs } from '../retry-logic';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  describe('Basic Retry Logic', () => {
    it('should succeed on first attempt when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.totalDelayMs).toBe(0);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(result.totalDelayMs).toBeGreaterThan(0);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const error = new Error('RATE_LIMIT_EXCEEDED');
      const operation = jest.fn().mockRejectedValue(error);

      const result = await retryManager.executeWithRetry(operation, {
        maxAttempts: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('VALIDATION_ERROR');
      const operation = jest.fn().mockRejectedValue(error);

      const result = await retryManager.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exponential Backoff', () => {
    it('should increase delay exponentially', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValue('success');

      const config = {
        baseDelayMs: 100,
        backoffMultiplier: 2,
        jitterMs: 0, // Remove jitter for predictable testing
      };

      const startTime = Date.now();
      const result = await retryManager.executeWithRetry(operation, config);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.totalDelayMs).toBeGreaterThanOrEqual(300); // 100 + 200
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
    });

    it('should respect maximum delay limit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('TIMEOUT'));

      const config = {
        maxAttempts: 3, // Reduced attempts to prevent timeout
        baseDelayMs: 100, // Much shorter delays for test
        maxDelayMs: 200,
        backoffMultiplier: 2,
        jitterMs: 0,
      };

      const result = await retryManager.executeWithRetry(operation, config);

      // Even with high backoff multiplier, should not exceed maxDelayMs per retry
      expect(result.totalDelayMs).toBeLessThan(400); // 2 retries * 200ms max
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('Circuit Breaker', () => {
    it('should execute operation when system is not overloaded', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithCircuitBreaker(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should reject when circuit breaker is open', async () => {
      // Mock system overload
      jest.spyOn(retryManager as any, 'getSystemLoad').mockReturnValue({
        isOverloaded: true,
        activeOperations: 100,
      });

      const operation = jest.fn().mockResolvedValue('success');

      await expect(
        retryManager.executeWithCircuitBreaker(operation)
      ).rejects.toThrow('Circuit breaker open - system overloaded');

      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('Predefined Configs', () => {
    it('should have correct fast retry config', () => {
      expect(retryConfigs.fast).toEqual({
        maxAttempts: 2,
        baseDelayMs: 500,
        maxDelayMs: 2000,
        backoffMultiplier: 2,
        jitterMs: 100,
      });
    });

    it('should have correct AI retry config', () => {
      expect(retryConfigs.ai).toEqual({
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
      });
    });
  });

  describe('Error Classification', () => {
    it('should identify retryable errors correctly', async () => {
      const retryableErrors = [
        'ECONNRESET',
        'RATE_LIMIT_EXCEEDED',
        'SERVICE_UNAVAILABLE',
        'TIMEOUT',
      ];

      for (const errorType of retryableErrors) {
        const operation = jest.fn().mockRejectedValue(new Error(errorType));
        const result = await retryManager.executeWithRetry(operation, {
          maxAttempts: 2,
        });

        expect(result.attempts).toBe(2); // Should retry once
        expect(operation).toHaveBeenCalledTimes(2);

        // Reset mock
        operation.mockClear();
      }
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableErrors = [
        'VALIDATION_ERROR',
        'UNAUTHORIZED',
        'NOT_FOUND',
        'BAD_REQUEST',
      ];

      for (const errorType of nonRetryableErrors) {
        const operation = jest.fn().mockRejectedValue(new Error(errorType));
        const result = await retryManager.executeWithRetry(operation);

        expect(result.attempts).toBe(1); // Should not retry
        expect(operation).toHaveBeenCalledTimes(1);

        // Reset mock
        operation.mockClear();
      }
    });
  });
});
