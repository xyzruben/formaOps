import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth/server';
import { getExecutionById } from '../../../../lib/database/queries';
import { handleApiError } from '../../../../lib/utils/error-handler';

export async function GET(
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

    // Get execution details
    const execution = await getExecutionById(executionId, user.id);
    
    if (!execution) {
      return NextResponse.json(
        { 
          error: 'Execution not found', 
          code: 'NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Determine if execution can be retried
    const canRetry = execution.status === 'FAILED';

    return NextResponse.json({
      success: true,
      data: {
        execution,
        canRetry,
      },
    });

  } catch (error) {
    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}