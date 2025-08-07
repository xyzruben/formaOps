import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { getPromptById, createExecution, updateExecution } from '@/lib/database/queries';
import { executePrompt } from '@/lib/openai/client';

const ExecutePromptSchema = z.object({
  inputs: z.record(z.unknown()),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  validateOutput: z.boolean().optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const user = await requireAuth();
    const { id: promptId } = params;
    const body = await request.json();
    
    const data = ExecutePromptSchema.parse(body);

    // Get the prompt
    const prompt = await getPromptById(promptId, user.id);
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create execution record
    const execution = await createExecution(user.id, promptId, data);
    
    try {
      // Update execution to RUNNING status
      await updateExecution(execution.id, {
        status: 'RUNNING',
        startedAt: new Date(),
      });

      // Execute the prompt with OpenAI
      const result = await executePrompt(prompt.template, data.inputs);
      
      const latencyMs = Date.now() - startTime;
      
      // Calculate approximate cost (GPT-3.5-turbo pricing)
      const costUsd = (
        result.tokenUsage.input * 0.0015 / 1000 + // $0.0015 per 1K input tokens
        result.tokenUsage.output * 0.002 / 1000   // $0.002 per 1K output tokens
      );

      // Update execution with results
      await updateExecution(execution.id, {
        status: 'COMPLETED',
        output: result.output,
        validationStatus: data.validateOutput === false ? 'SKIPPED' : 'PASSED',
        latencyMs,
        costUsd,
        tokenUsage: result.tokenUsage,
        completedAt: new Date(),
      });

      return NextResponse.json({
        executionId: execution.id,
        output: result.output,
        validationStatus: data.validateOutput === false ? 'SKIPPED' : 'PASSED',
        tokenUsage: result.tokenUsage,
        costUsd,
        latencyMs,
      });

    } catch (aiError) {
      // Update execution with error status
      await updateExecution(execution.id, {
        status: 'FAILED',
        completedAt: new Date(),
      });

      throw aiError;
    }

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle OpenAI errors
    if (error && typeof error === 'object' && 'status' in error) {
      return NextResponse.json(
        { error: 'AI service error', code: 'AI_ERROR' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}