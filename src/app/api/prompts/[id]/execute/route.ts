import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '../../../../../lib/auth/server';
import {
  getPromptById,
  createExecution,
  updateExecution,
} from '../../../../../lib/database/queries';
import { openAIClient } from '../../../../../lib/openai/client';
import { templateEngine } from '../../../../../lib/prompts/template-engine';
import { schemaValidator } from '../../../../../lib/validation/schema-validator';
import { logger } from '../../../../../lib/monitoring/logger';
import {
  executionErrorHandler,
  ExecutionError,
} from '../../../../../lib/execution/error-handler';

const ExecutePromptSchema = z.object({
  inputs: z.record(z.unknown()),
  model: z.enum(['gpt-3.5-turbo', 'gpt-4']).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { id: promptId } = params;

  let execution: { id: string; status: string; startedAt: Date | null } | null = null;

  try {
    // Authentication
    const user = await requireAuth();
    const body = await request.json();
    const data = ExecutePromptSchema.parse(body);

    // Get and validate prompt
    const prompt = await getPromptById(promptId, user.id);
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate prompt is not archived
    if (prompt.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Cannot execute archived prompt', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create execution record
    const executionData = {
      inputs: data.inputs,
      model: data.model || 'gpt-3.5-turbo',
      priority: 'NORMAL' as const,
    };

    execution = await createExecution(user.id, promptId, executionData);

    // Log execution start
    await logger.logExecutionStart(execution.id, {
      promptId,
      userId: user.id,
      inputs: data.inputs,
      priority: 'NORMAL',
      model: data.model,
    });

    // Update to RUNNING status
    await updateExecution(execution.id, {
      status: 'RUNNING',
      startedAt: new Date(),
    });

    // Process template with variables
    const variableDefinitions = Array.isArray(prompt.variables)
      ? (prompt.variables as Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'array'; required: boolean; description?: string }>)
      : [];

    const templateResult = templateEngine.processTemplate(
      prompt.template,
      data.inputs,
      variableDefinitions
    );

    if (!templateResult.isValid) {
      await updateExecution(execution.id, {
        status: 'FAILED',
        completedAt: new Date(),
      });

      return NextResponse.json(
        {
          error: 'Required variables missing',
          code: 'VALIDATION_ERROR',
          details: { missingVariables: templateResult.missingVariables },
        },
        { status: 400 }
      );
    }

    // Execute with OpenAI using error handler and retry logic
    const startTime = Date.now();
    let attemptCount = 0;

    if (!execution) {
      throw new Error('Execution not created');
    }

    const executionId = execution.id; // Extract ID to avoid null issues in callbacks

    const aiResult = await executionErrorHandler.executeWithRetry(
      executionId,
      async () => {
        attemptCount++;

        // Note: Retry count tracking would be implemented via logs/metadata
        // The retryCount field doesn't exist in the current Execution model

        return await openAIClient.executePrompt(
          templateResult.processedTemplate,
          {
            model: data.model,
            maxTokens: data.maxTokens,
            temperature: data.temperature,
          },
          executionId
        );
      },
      async (attempt, delay) => {
        // Log retry attempt
        await logger.info('Execution retry attempt', {
          executionId,
          attempt,
          delayMs: delay,
          totalAttempts: attemptCount,
        });
      }
    );

    const latencyMs = Date.now() - startTime;

    // Validate AI output against prompt's validation rules (if any)
    let validationResult = null;
    try {
      validationResult = await schemaValidator.validateExecutionOutput(
        execution.id,
        aiResult.output
      );
    } catch (validationError) {
      // Log validation error but don't fail the execution
      await logger.error(
        'Output validation failed',
        validationError,
        {},
        execution.id
      );
    }

    // Update execution with successful results
    await updateExecution(execution.id, {
      status: 'COMPLETED',
      output: aiResult.output,
      validationStatus: validationResult?.validationStatus || 'SKIPPED',
      latencyMs,
      costUsd: aiResult.costUsd,
      completedAt: new Date(),
      tokenUsage: {
        input: aiResult.tokenUsage.inputTokens,
        output: aiResult.tokenUsage.outputTokens,
        total: aiResult.tokenUsage.totalTokens,
        model: aiResult.model,
      },
    });

    // Log successful completion
    await logger.logExecutionComplete(execution.id, {
      status: 'COMPLETED',
      latencyMs,
      tokenUsage: {
        input: aiResult.tokenUsage.inputTokens,
        output: aiResult.tokenUsage.outputTokens,
        total: aiResult.tokenUsage.totalTokens,
      },
      costUsd: aiResult.costUsd,
      validationStatus: validationResult?.validationStatus || 'SKIPPED',
    });

    // Return success response
    return NextResponse.json({
      executionId: execution.id,
      status: 'COMPLETED',
      output: aiResult.output,
      tokenUsage: {
        inputTokens: aiResult.tokenUsage.inputTokens,
        outputTokens: aiResult.tokenUsage.outputTokens,
        totalTokens: aiResult.tokenUsage.totalTokens,
      },
      costUsd: aiResult.costUsd,
      validationStatus: validationResult?.validationStatus || 'SKIPPED',
      validationErrors: validationResult?.errors || [],
    });
  } catch (error) {
    // Process error through execution error handler
    let executionError: ExecutionError;

    // Check if this is a final error from retry handler
    if (error && typeof error === 'object' && 'executionError' in error) {
      executionError = (error as { executionError: ExecutionError }).executionError;
    } else {
      executionError = executionErrorHandler.handleError(error);
    }

    // Update execution status to FAILED if we have an execution record
    if (execution) {
      const latencyMs =
        Date.now() - (execution.startedAt?.getTime() || Date.now());

      await updateExecution(execution.id, {
        status: 'FAILED',
        completedAt: new Date(),
        latencyMs,
      });

      await logger.logExecutionComplete(execution.id, {
        status: 'FAILED',
        latencyMs,
        error: executionError.message,
      });
    }

    // Return error response based on execution error type
    const statusCode =
      executionError.type === 'VALIDATION_ERROR'
        ? 400
        : executionError.type === 'RATE_LIMIT'
          ? 429
          : executionError.type === 'TIMEOUT'
            ? 408
            : 500;

    return NextResponse.json(
      {
        error: executionError.message,
        code: executionError.type,
        retryable: executionError.retryable,
        retryAfter: executionError.retryAfter,
        executionId: execution?.id,
      },
      { status: statusCode }
    );
  }
}
