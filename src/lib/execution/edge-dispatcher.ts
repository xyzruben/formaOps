import { aiExecutor } from '../agent/executor';
import { validationEngine } from '../validation/validator';
import { updateExecution } from '../database/queries';
import type { Priority, ExecutionStatus } from '@prisma/client';
import type { ValidationRule } from '../validation/validator';

export interface EdgeExecutionRequest {
  executionId: string;
  promptId: string;
  userId: string;
  template: string;
  inputs: Record<string, unknown>;
  priority: Priority;
  validationRules: ValidationRule[];
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  };
}

export interface EdgeExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  output?: string;
  validatedOutput?: unknown;
  validationSummary?: {
    overallValid: boolean;
    passedCount: number;
    failedCount: number;
    results: any[];
  };
  error?: string;
  metrics: {
    latencyMs: number;
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
      model: string;
    };
    costUsd?: number;
    validationTime?: number;
  };
}

export class EdgeDispatcher {
  /**
   * Simulates edge function execution by running the AI execution
   * and validation pipeline in the current process
   */
  public async dispatchExecution(request: EdgeExecutionRequest): Promise<EdgeExecutionResult> {
    const startTime = Date.now();
    const { executionId, template, inputs, priority, validationRules, options } = request;

    try {
      // Update execution status to RUNNING
      await updateExecution(executionId, {
        status: 'RUNNING',
        startedAt: new Date(),
      });

      // Execute with priority management
      const aiResult = await aiExecutor.executeWithPriority(
        request.promptId,
        request.userId,
        template,
        inputs,
        {
          ...options,
          priority,
        }
      );

      // Run validation if rules are provided
      let validationSummary;
      let validatedOutput = aiResult.output;
      const validationStartTime = Date.now();

      if (validationRules.length > 0) {
        validationSummary = await validationEngine.validateOutput(
          aiResult.output,
          validationRules,
          {
            inputs,
            metadata: {
              tokenUsage: aiResult.tokenUsage,
              model: aiResult.tokenUsage.model,
              latencyMs: aiResult.latencyMs,
            },
          }
        );

        // If validation passes and provides validated data, use it
        if (validationSummary.overallValid) {
          const schemaResult = validationSummary.results.find(r => r.type === 'SCHEMA');
          if (schemaResult?.result) {
            validatedOutput = typeof schemaResult.result === 'string' 
              ? schemaResult.result 
              : JSON.stringify(schemaResult.result);
          }
        }
      }

      const totalLatency = Date.now() - startTime;
      const validationTime = validationSummary ? Date.now() - validationStartTime : 0;

      // Update execution with results
      await updateExecution(executionId, {
        status: 'COMPLETED',
        output: aiResult.output,
        validatedOutput: validatedOutput !== aiResult.output ? validatedOutput : null,
        validationStatus: validationSummary ? 
          (validationSummary.overallValid ? 'PASSED' : 'FAILED') : 'SKIPPED',
        latencyMs: totalLatency,
        tokenUsage: aiResult.tokenUsage,
        costUsd: aiResult.costUsd,
        completedAt: new Date(),
      });

      return {
        executionId,
        status: 'COMPLETED',
        output: aiResult.output,
        validatedOutput: validatedOutput !== aiResult.output ? validatedOutput : undefined,
        validationSummary: validationSummary ? {
          overallValid: validationSummary.overallValid,
          passedCount: validationSummary.passedCount,
          failedCount: validationSummary.failedCount,
          results: validationSummary.results,
        } : undefined,
        metrics: {
          latencyMs: totalLatency,
          tokenUsage: aiResult.tokenUsage,
          costUsd: aiResult.costUsd,
          validationTime,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      
      // Update execution with error status
      await updateExecution(executionId, {
        status: 'FAILED',
        completedAt: new Date(),
        latencyMs: Date.now() - startTime,
      });

      return {
        executionId,
        status: 'FAILED',
        error: errorMessage,
        metrics: {
          latencyMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Simulates queued execution by adding delay based on system load
   */
  public async queueExecution(request: EdgeExecutionRequest): Promise<{
    queuePosition: number;
    estimatedWaitTime: number;
    executeWhenReady: () => Promise<EdgeExecutionResult>;
  }> {
    const systemLoad = aiExecutor.getSystemLoad();
    const queuePosition = systemLoad.queuedExecutions + 1;
    const estimatedWaitTime = queuePosition * 3000; // 3 seconds per queued item

    return {
      queuePosition,
      estimatedWaitTime,
      executeWhenReady: async () => {
        // Simulate queue waiting time
        if (estimatedWaitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.min(estimatedWaitTime, 5000)));
        }
        
        return this.dispatchExecution(request);
      },
    };
  }

  /**
   * Gets current system load for monitoring
   */
  public getSystemLoad(): {
    activeExecutions: number;
    queuedExecutions: number;
    cpuUtilization: number;
    shouldDegradeUI: boolean;
    healthStatus: 'healthy' | 'degraded' | 'overloaded';
  } {
    const load = aiExecutor.getSystemLoad();
    
    let healthStatus: 'healthy' | 'degraded' | 'overloaded' = 'healthy';
    if (load.cpuUtilization > 90) {
      healthStatus = 'overloaded';
    } else if (load.cpuUtilization > 70 || load.shouldDegradeUI) {
      healthStatus = 'degraded';
    }

    return {
      ...load,
      healthStatus,
    };
  }

  /**
   * Simulates batch execution for multiple requests
   */
  public async dispatchBatch(requests: EdgeExecutionRequest[]): Promise<EdgeExecutionResult[]> {
    // Sort by priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    const sortedRequests = requests.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    // Execute in parallel with concurrency limit
    const concurrencyLimit = 3;
    const results: EdgeExecutionResult[] = [];

    for (let i = 0; i < sortedRequests.length; i += concurrencyLimit) {
      const batch = sortedRequests.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(request => this.dispatchExecution(request))
      );
      results.push(...batchResults);
    }

    return results;
  }
}

// Singleton instance
export const edgeDispatcher = new EdgeDispatcher();