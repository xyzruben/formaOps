import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '../../../lib/auth/server';
import { ExecutionRepository } from '../../../lib/repositories/execution-repository';
import { handleApiError } from '../../../lib/utils/error-handler';

// Force dynamic rendering - do not try to statically generate this API route
export const dynamic = 'force-dynamic';

const ExecutionsQuerySchema = z.object({
  page: z.preprocess(
    val => (val === null ? undefined : val),
    z.coerce.number().min(1).default(1)
  ),
  limit: z.preprocess(
    val => (val === null ? undefined : val),
    z.coerce.number().min(1).max(100).default(20)
  ),
  status: z
    .enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])
    .optional(),
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
      status: searchParams.get('status') || undefined,
      promptId: searchParams.get('promptId') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    });

    // Use ExecutionRepository for proper data transformation
    const repository = new ExecutionRepository();
    const result = await repository.getExecutions({
      userId: user.id,
      promptId: query.promptId,
      status: query.status,
      page: query.page,
      limit: query.limit,
      from: query.from,
      to: query.to,
    });

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
