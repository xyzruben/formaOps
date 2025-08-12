import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '../../../lib/auth/server';
import { getExecutionHistory, type ExecutionFilters } from '../../../lib/database/queries';
import { handleApiError } from '../../../lib/utils/error-handler';

const ExecutionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  promptId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    const query = ExecutionsQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      promptId: searchParams.get('promptId'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    });

    const options = {
      page: query.page,
      limit: query.limit,
      status: query.status,
      promptId: query.promptId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    // Build filters for the new getExecutionHistory function
    const filters: ExecutionFilters = {
      userId: user.id,
      promptId: query.promptId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    };
    
    // Add date range filter if provided
    if (options.from || options.to) {
      filters.dateRange = {
        from: options.from || new Date(0),
        to: options.to || new Date(),
      };
    }

    const result = await getExecutionHistory(filters);

    return NextResponse.json({
      success: true,
      data: {
        executions: result.executions,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}