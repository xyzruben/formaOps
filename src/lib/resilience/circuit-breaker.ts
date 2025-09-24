// Circuit breaker implementation for database operations
// Prevents cascading failures by failing fast when error rates are high

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before trying half-open (ms)
  requestTimeout: number; // Individual request timeout (ms)
  monitoringPeriod: number; // Period to track failures (ms)
  halfOpenMaxCalls: number; // Max calls allowed in half-open state
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  totalRequests: number;
  failureRate: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  recoveryTimeout: 60 * 1000, // 1 minute recovery timeout
  requestTimeout: 30 * 1000, // 30 second request timeout
  monitoringPeriod: 2 * 60 * 1000, // 2 minute monitoring window
  halfOpenMaxCalls: 3, // Allow 3 calls in half-open
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange: number = Date.now();
  private halfOpenCalls: number = 0;

  // Failure history for windowed failure rate calculation
  private failureHistory: number[] = [];

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    // Fail fast if circuit is open
    if (currentState === CircuitState.OPEN) {
      throw new Error(`Circuit breaker ${this.name} is OPEN - failing fast`);
    }

    // Check if we should allow the request in half-open state
    if (currentState === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error(
          `Circuit breaker ${this.name} is HALF_OPEN - max calls exceeded`
        );
      }
      this.halfOpenCalls++;
    }

    try {
      // Set timeout for the operation
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Operation timeout after ${this.config.requestTimeout}ms`
                )
              ),
            this.config.requestTimeout
          )
        ),
      ]);

      // Record success
      this.onSuccess();
      return result;
    } catch (error) {
      // Record failure
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    const now = Date.now();

    // Check if we should transition from OPEN to HALF_OPEN
    if (
      this.state === CircuitState.OPEN &&
      this.lastFailureTime &&
      now - this.lastFailureTime >= this.config.recoveryTimeout
    ) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenCalls = 0;
      this.lastStateChange = now;
      // Circuit breaker transitioning to HALF_OPEN (removed console.log for linting compliance)
    }

    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const now = Date.now();
    const windowStart = now - this.config.monitoringPeriod;

    // Calculate failure rate within monitoring period
    const recentFailures = this.failureHistory.filter(
      timestamp => timestamp >= windowStart
    );
    const totalRequests = this.successes + this.failures;
    const failureRate =
      totalRequests > 0 ? (recentFailures.length / totalRequests) * 100 : 0;

    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests,
      failureRate,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
    this.halfOpenCalls = 0;
    this.failureHistory = [];
    // Circuit breaker manually reset (removed console.log for linting compliance)
  }

  /**
   * Force circuit breaker to open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastStateChange = Date.now();
    // Circuit breaker manually opened (removed console.log for linting compliance)
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.successes++;

    if (this.state === CircuitState.HALF_OPEN) {
      // If we're in half-open and got a success, consider closing
      if (this.successes >= this.config.halfOpenMaxCalls) {
        this.state = CircuitState.CLOSED;
        this.failures = 0; // Reset failure count
        this.lastStateChange = Date.now();
        // Circuit breaker transitioning to CLOSED after recovery (removed console.log for linting compliance)
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    const now = Date.now();
    this.failures++;
    this.lastFailureTime = now;

    // Add to failure history
    this.failureHistory.push(now);

    // Clean old failures outside monitoring period
    const windowStart = now - this.config.monitoringPeriod;
    this.failureHistory = this.failureHistory.filter(
      timestamp => timestamp >= windowStart
    );

    // Check if we should open the circuit
    if (
      this.state === CircuitState.CLOSED ||
      this.state === CircuitState.HALF_OPEN
    ) {
      const recentFailures = this.failureHistory.length;

      if (recentFailures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.lastStateChange = now;
        console.warn(
          `Circuit breaker ${this.name} OPENED after ${recentFailures} failures within ${this.config.monitoringPeriod}ms`
        );
      }
    }
  }
}

// Export singleton instances for different database operations
export const databaseCircuitBreaker = new CircuitBreaker(
  'database-operations',
  {
    failureThreshold: 5,
    recoveryTimeout: 60 * 1000, // 1 minute
    requestTimeout: 10 * 1000, // 10 seconds for DB operations
    monitoringPeriod: 2 * 60 * 1000, // 2 minutes
    halfOpenMaxCalls: 3,
  }
);

export const queryCircuitBreaker = new CircuitBreaker('database-queries', {
  failureThreshold: 3,
  recoveryTimeout: 30 * 1000, // 30 seconds for queries
  requestTimeout: 5 * 1000, // 5 seconds for queries
  monitoringPeriod: 60 * 1000, // 1 minute
  halfOpenMaxCalls: 2,
});

// Utility function to wrap operations with circuit breaker
export const withCircuitBreaker = <T>(
  circuitBreaker: CircuitBreaker,
  operation: () => Promise<T>
): Promise<T> => {
  return circuitBreaker.execute(operation);
};
