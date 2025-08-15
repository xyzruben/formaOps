import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth/server';
import { retryExecution, getExecutionById } from '../../../../../lib/database/queries';
import { handleApiError } from '../../../../../lib/utils/error-handler';
import { logger } from '../../../../../lib/monitoring/logger';
import { executionErrorHandler } from '../../../../../lib/execution/error-handler';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Authentication
    const user = await requireAuth();
    const params = await context.params;
    const { id: executionId } = params;

    // Validate execution ID format (basic UUID validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(executionId)) {
      return NextResponse.json(
        { 
          error: 'Invalid execution ID format', 
          code: 'VALIDATION_ERROR' 
        },
        { status: 400 }
      );
    }

    // Verify the execution exists and belongs to the user before retrying
    const originalExecution = await getExecutionById(executionId, user.id);
    
    if (!originalExecution) {
      return NextResponse.json(
        { 
          error: 'Execution not found', 
          code: 'NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Verify execution can be retried
    if (originalExecution.status !== 'FAILED') {
      return NextResponse.json(
        { 
          error: 'Only failed executions can be retried', 
          code: 'VALIDATION_ERROR',
          details: { 
            currentStatus: originalExecution.status,
            allowedStatuses: ['FAILED'] 
          }
        },
        { status: 400 }
      );
    }

    // Check if the execution failed and is retryable
    if (originalExecution.status === 'FAILED') {
      const mockError = {
        type: 'API_ERROR' as const,
        message: 'Execution failed',
        retryable: true
      };

      // For now, allow all failed executions to be retried
      // In a real implementation, you'd check retry count from logs or metadata
      if (!executionErrorHandler.shouldRetry(mockError, 0)) {
        return NextResponse.json(
          { 
            error: 'This execution cannot be retried',
            code: 'RETRY_NOT_ALLOWED',
            details: { 
              status: originalExecution.status,
              reason: 'Maximum retry attempts exceeded'
            }
          },
          { status: 400 }
        );
      }
    }

    // Create retry execution
    const newExecution = await retryExecution(executionId, user.id);

    // Log the retry action
    await logger.info('Execution retry initiated', {
      originalExecutionId: executionId,
      newExecutionId: newExecution.id,
      promptId: originalExecution.prompt.id,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        newExecutionId: newExecution.id,
        originalExecutionId: executionId,
        message: 'Execution retry initiated successfully',
      },
    });

  } catch (error) {
    // Log retry failure
    await logger.error('Execution retry failed', error, {
      executionId: (await context.params).id,
      userId: 'unknown',
    });

    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}