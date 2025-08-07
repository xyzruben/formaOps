import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { getUserExecutions } from '@/lib/database/queries';

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

    const result = await getUserExecutions(user.id, options);

    return NextResponse.json(result);
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

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}