export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'percent' | 'bytes';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SystemMetrics {
  executionMetrics: {
    totalExecutions: number;
    successRate: number;
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
  };
  aiMetrics: {
    avgTokensPerExecution: number;
    avgCostPerExecution: number;
    modelDistribution: Record<string, number>;
    errorRate: number;
  };
  systemMetrics: {
    activeExecutions: number;
    queuedExecutions: number;
    cpuUtilization: number;
    memoryUsage?: number;
  };
  validationMetrics: {
    totalValidations: number;
    validationSuccessRate: number;
    avgValidationTime: number;
  };
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics in memory
  private alertThresholds: AlertThreshold[] = [];

  constructor() {
    this.initializeDefaultAlerts();
  }

  public recordMetric(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || new Date(),
    });

    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check for alerts
    this.checkAlerts(metric);
  }

  public recordExecutionLatency(latencyMs: number, metadata?: Record<string, unknown>): void {
    this.recordMetric({
      name: 'execution_latency',
      value: latencyMs,
      unit: 'ms',
      timestamp: new Date(),
      metadata,
    });
  }

  public recordExecutionSuccess(success: boolean, metadata?: Record<string, unknown>): void {
    this.recordMetric({
      name: 'execution_success',
      value: success ? 1 : 0,
      unit: 'count',
      timestamp: new Date(),
      metadata,
    });
  }

  public recordTokenUsage(tokens: number, metadata?: Record<string, unknown>): void {
    this.recordMetric({
      name: 'token_usage',
      value: tokens,
      unit: 'count',
      timestamp: new Date(),
      metadata,
    });
  }

  public recordValidationTime(timeMs: number, metadata?: Record<string, unknown>): void {
    this.recordMetric({
      name: 'validation_time',
      value: timeMs,
      unit: 'ms',
      timestamp: new Date(),
      metadata,
    });
  }

  public recordCost(costUsd: number, metadata?: Record<string, unknown>): void {
    this.recordMetric({
      name: 'execution_cost',
      value: costUsd,
      unit: 'count', // Using count for currency
      timestamp: new Date(),
      metadata,
    });
  }

  public getMetrics(metricName?: string, since?: Date): PerformanceMetric[] {
    let filtered = this.metrics;

    if (metricName) {
      filtered = filtered.filter(m => m.name === metricName);
    }

    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  public getSystemMetrics(timeWindowHours = 24): SystemMetrics {
    const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const metrics = this.getMetrics(undefined, since);

    // Execution metrics
    const executionLatencies = metrics
      .filter(m => m.name === 'execution_latency')
      .map(m => m.value);

    const executionSuccesses = metrics
      .filter(m => m.name === 'execution_success');

    const successCount = executionSuccesses.filter(m => m.value === 1).length;
    const totalExecutions = executionSuccesses.length;

    // AI metrics
    const tokenMetrics = metrics.filter(m => m.name === 'token_usage');
    const costMetrics = metrics.filter(m => m.name === 'execution_cost');

    const avgTokensPerExecution = tokenMetrics.length > 0 
      ? tokenMetrics.reduce((sum, m) => sum + m.value, 0) / tokenMetrics.length 
      : 0;

    const avgCostPerExecution = costMetrics.length > 0
      ? costMetrics.reduce((sum, m) => sum + m.value, 0) / costMetrics.length
      : 0;

    // Model distribution
    const modelDistribution: Record<string, number> = {};
    metrics
      .filter(m => m.metadata?.model)
      .forEach(m => {
        const model = m.metadata!.model as string;
        modelDistribution[model] = (modelDistribution[model] || 0) + 1;
      });

    // Validation metrics
    const validationMetrics = metrics.filter(m => m.name === 'validation_time');
    const avgValidationTime = validationMetrics.length > 0
      ? validationMetrics.reduce((sum, m) => sum + m.value, 0) / validationMetrics.length
      : 0;

    return {
      executionMetrics: {
        totalExecutions,
        successRate: totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0,
        avgLatency: executionLatencies.length > 0 
          ? executionLatencies.reduce((a, b) => a + b, 0) / executionLatencies.length 
          : 0,
        p50Latency: this.calculatePercentile(executionLatencies, 50),
        p95Latency: this.calculatePercentile(executionLatencies, 95),
        p99Latency: this.calculatePercentile(executionLatencies, 99),
      },
      aiMetrics: {
        avgTokensPerExecution,
        avgCostPerExecution,
        modelDistribution,
        errorRate: totalExecutions > 0 ? ((totalExecutions - successCount) / totalExecutions) * 100 : 0,
      },
      systemMetrics: {
        activeExecutions: 0, // Would be updated by system monitor
        queuedExecutions: 0, // Would be updated by system monitor
        cpuUtilization: 0,   // Would be updated by system monitor
      },
      validationMetrics: {
        totalValidations: validationMetrics.length,
        validationSuccessRate: 95, // Mock value - would be calculated from actual validation results
        avgValidationTime,
      },
    };
  }

  public addAlertThreshold(threshold: AlertThreshold): void {
    this.alertThresholds.push(threshold);
  }

  public removeAlertThreshold(metricName: string): void {
    this.alertThresholds = this.alertThresholds.filter(t => t.metric !== metricName);
  }

  public getActiveAlerts(): Array<{
    threshold: AlertThreshold;
    currentValue: number;
    triggeredAt: Date;
  }> {
    const now = new Date();
    const recentWindow = new Date(now.getTime() - 5 * 60 * 1000); // Last 5 minutes
    
    const alerts: Array<{
      threshold: AlertThreshold;
      currentValue: number;
      triggeredAt: Date;
    }> = [];

    for (const threshold of this.alertThresholds) {
      const recentMetrics = this.getMetrics(threshold.metric, recentWindow);
      
      if (recentMetrics.length === 0) continue;

      const currentValue = recentMetrics[0].value; // Most recent value
      let triggered = false;

      switch (threshold.operator) {
        case 'gt':
          triggered = currentValue > threshold.threshold;
          break;
        case 'lt':
          triggered = currentValue < threshold.threshold;
          break;
        case 'eq':
          triggered = currentValue === threshold.threshold;
          break;
      }

      if (triggered) {
        alerts.push({
          threshold,
          currentValue,
          triggeredAt: recentMetrics[0].timestamp,
        });
      }
    }

    return alerts;
  }

  public generateReport(timeWindowHours = 24): {
    summary: SystemMetrics;
    trends: Array<{
      metric: string;
      trend: 'improving' | 'degrading' | 'stable';
      change: number;
    }>;
    alerts: Array<{
      threshold: AlertThreshold;
      currentValue: number;
      triggeredAt: Date;
    }>;
  } {
    const summary = this.getSystemMetrics(timeWindowHours);
    const alerts = this.getActiveAlerts();
    
    // Calculate trends (comparing current hour to previous hour)
    const currentHour = this.getSystemMetrics(1);
    const previousHour = this.getSystemMetrics(2);
    
    const trends = [
      {
        metric: 'success_rate',
        trend: this.getTrend(currentHour.executionMetrics.successRate, previousHour.executionMetrics.successRate),
        change: currentHour.executionMetrics.successRate - previousHour.executionMetrics.successRate,
      },
      {
        metric: 'avg_latency',
        trend: this.getTrend(previousHour.executionMetrics.avgLatency, currentHour.executionMetrics.avgLatency), // Inverted for latency
        change: currentHour.executionMetrics.avgLatency - previousHour.executionMetrics.avgLatency,
      },
      {
        metric: 'error_rate',
        trend: this.getTrend(previousHour.aiMetrics.errorRate, currentHour.aiMetrics.errorRate), // Inverted for error rate
        change: currentHour.aiMetrics.errorRate - previousHour.aiMetrics.errorRate,
      },
    ];

    return {
      summary,
      trends,
      alerts,
    };
  }

  private getTrend(current: number, previous: number): 'improving' | 'degrading' | 'stable' {
    const changePercent = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    
    if (Math.abs(changePercent) < 5) return 'stable';
    return changePercent > 0 ? 'improving' : 'degrading';
  }

  private checkAlerts(metric: PerformanceMetric): void {
    const relevantThresholds = this.alertThresholds.filter(t => t.metric === metric.name);
    
    for (const threshold of relevantThresholds) {
      let triggered = false;

      switch (threshold.operator) {
        case 'gt':
          triggered = metric.value > threshold.threshold;
          break;
        case 'lt':
          triggered = metric.value < threshold.threshold;
          break;
        case 'eq':
          triggered = metric.value === threshold.threshold;
          break;
      }

      if (triggered) {
        console.warn(`[ALERT] ${threshold.severity.toUpperCase()}: ${threshold.message}`, {
          metric: metric.name,
          value: metric.value,
          threshold: threshold.threshold,
          timestamp: metric.timestamp,
        });
      }
    }
  }

  private initializeDefaultAlerts(): void {
    this.alertThresholds = [
      {
        metric: 'execution_latency',
        operator: 'gt',
        threshold: 10000, // 10 seconds
        severity: 'high',
        message: 'Execution latency exceeds 10 seconds',
      },
      {
        metric: 'execution_success',
        operator: 'lt',
        threshold: 0.95, // 95% success rate
        severity: 'medium',
        message: 'Execution success rate below 95%',
      },
      {
        metric: 'validation_time',
        operator: 'gt',
        threshold: 2000, // 2 seconds
        severity: 'medium',
        message: 'Validation time exceeds 2 seconds',
      },
    ];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();