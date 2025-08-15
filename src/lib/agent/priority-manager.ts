import type { Priority } from '@prisma/client';

export interface PriorityConfig {
  maxConcurrentAgentOps: number;
  agentCpuReservation: number;
  uiOperationThreshold: number;
  autoScaleThreshold: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeoutMs: number;
  recoveryTimeMs: number;
  fallbackStrategy: 'queue' | 'reject' | 'degrade';
}

export interface ExecutionJob {
  id: string;
  promptId: string;
  userId: string;
  priority: Priority;
  inputs: Record<string, unknown>;
  createdAt: Date;
  estimatedDuration?: number;
}

export class PriorityManager {
  private config: PriorityConfig;
  private circuitBreakerConfig: CircuitBreakerConfig;
  private activeExecutions = new Map<string, ExecutionJob>();
  private queuedExecutions: ExecutionJob[] = [];
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerOpen = false;

  constructor() {
    this.config = {
      maxConcurrentAgentOps: parseInt(process.env.AGENT_MAX_CONCURRENT || '5'),
      agentCpuReservation: parseInt(process.env.AGENT_CPU_RESERVE || '70'),
      uiOperationThreshold: parseInt(process.env.UI_THRESHOLD || '2'),
      autoScaleThreshold: parseInt(process.env.SCALE_THRESHOLD || '80'),
    };

    this.circuitBreakerConfig = {
      failureThreshold: parseInt(process.env.FAILURE_THRESHOLD || '5'),
      timeoutMs: parseInt(process.env.TIMEOUT_MS || '30000'),
      recoveryTimeMs: parseInt(process.env.RECOVERY_TIME || '60000'),
      fallbackStrategy: (process.env.FALLBACK_STRATEGY as any) || 'queue',
    };
  }

  public async scheduleExecution(job: ExecutionJob): Promise<{
    shouldExecuteNow: boolean;
    estimatedWaitTime?: number;
    queuePosition?: number;
  }> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      return this.handleCircuitBreakerOpen(job);
    }

    // Check if we can execute immediately
    if (this.canExecuteNow(job)) {
      this.activeExecutions.set(job.id, job);
      return { shouldExecuteNow: true };
    }

    // Add to priority queue
    this.addToQueue(job);
    
    return {
      shouldExecuteNow: false,
      queuePosition: this.getQueuePosition(job.id),
      estimatedWaitTime: this.estimateWaitTime(job),
    };
  }

  public completeExecution(executionId: string, success: boolean): void {
    this.activeExecutions.delete(executionId);
    
    if (!success) {
      this.recordFailure();
    } else {
      this.recordSuccess();
    }

    // Process next job in queue
    this.processNextInQueue();
  }

  public getSystemLoad(): {
    activeExecutions: number;
    queuedExecutions: number;
    cpuUtilization: number;
    shouldDegradeUI: boolean;
  } {
    const activeCount = this.activeExecutions.size;
    const cpuUtilization = (activeCount / this.config.maxConcurrentAgentOps) * 100;
    
    return {
      activeExecutions: activeCount,
      queuedExecutions: this.queuedExecutions.length,
      cpuUtilization,
      shouldDegradeUI: activeCount >= this.config.uiOperationThreshold,
    };
  }

  private canExecuteNow(job: ExecutionJob): boolean {
    const activeCount = this.activeExecutions.size;
    
    // Always allow HIGH and CRITICAL priority if under absolute limit
    if ((job.priority === 'HIGH' || job.priority === 'CRITICAL') && 
        activeCount < this.config.maxConcurrentAgentOps) {
      return true;
    }
    
    // Normal flow - respect CPU reservation
    const reservedSlots = Math.floor(
      this.config.maxConcurrentAgentOps * (this.config.agentCpuReservation / 100)
    );
    
    return activeCount < reservedSlots;
  }

  private addToQueue(job: ExecutionJob): void {
    // Insert based on priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    const jobPriority = priorityOrder[job.priority];
    
    let insertIndex = this.queuedExecutions.length;
    for (let i = 0; i < this.queuedExecutions.length; i++) {
      const queuedPriority = priorityOrder[this.queuedExecutions[i]?.priority] ?? 999;
      if (jobPriority < queuedPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queuedExecutions.splice(insertIndex, 0, job);
  }

  private processNextInQueue(): void {
    if (this.queuedExecutions.length === 0) return;
    
    const nextJob = this.queuedExecutions[0];
    if (this.canExecuteNow(nextJob)) {
      this.queuedExecutions.shift();
      this.activeExecutions.set(nextJob.id, nextJob);
      
      // Trigger execution (would emit event in real system)
      this.triggerExecution(nextJob);
    }
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpen) return false;
    
    // Check if recovery time has passed
    if (Date.now() - this.lastFailureTime > this.circuitBreakerConfig.recoveryTimeMs) {
      this.circuitBreakerOpen = false;
      this.failureCount = 0;
      return false;
    }
    
    return true;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      this.circuitBreakerOpen = true;
    }
  }

  private recordSuccess(): void {
    // Gradually reduce failure count on success
    if (this.failureCount > 0) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private handleCircuitBreakerOpen(job: ExecutionJob): {
    shouldExecuteNow: boolean;
    estimatedWaitTime?: number;
    queuePosition?: number;
  } {
    switch (this.circuitBreakerConfig.fallbackStrategy) {
      case 'reject':
        throw new Error('AI service temporarily unavailable - circuit breaker open');
      
      case 'degrade':
        // Allow critical operations only
        if (job.priority === 'CRITICAL') {
          this.activeExecutions.set(job.id, job);
          return { shouldExecuteNow: true };
        }
        throw new Error('System degraded - only critical operations allowed');
      
      case 'queue':
      default:
        this.addToQueue(job);
        return {
          shouldExecuteNow: false,
          queuePosition: this.getQueuePosition(job.id),
          estimatedWaitTime: this.circuitBreakerConfig.recoveryTimeMs,
        };
    }
  }

  private getQueuePosition(executionId: string): number {
    return this.queuedExecutions.findIndex(job => job.id === executionId) + 1;
  }

  private estimateWaitTime(job: ExecutionJob): number {
    const avgExecutionTime = 5000; // 5 seconds average
    const position = this.getQueuePosition(job.id);
    return position * avgExecutionTime;
  }

  private triggerExecution(job: ExecutionJob): void {
    // In a real system, this would emit an event or call the execution service
    console.log(`Triggering execution for job ${job.id} with priority ${job.priority}`);
  }
}

// Singleton instance
export const priorityManager = new PriorityManager();