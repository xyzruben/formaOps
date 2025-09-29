import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { getUserPrompts, createPrompt } from '@/lib/database/queries';

// Force dynamic rendering - do not try to statically generate this API route
export const dynamic = 'force-dynamic';

function extractVariablesFromTemplate(template: string): string[] {
  // Extract variables from {{variable}} patterns
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = variableRegex.exec(template)) !== null) {
    const variableName = match[1].trim();
    if (variableName) {
      variables.add(variableName);
    }
  }

  return Array.from(variables);
}

const VariableSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid variable name'),
  type: z.enum(['string', 'number', 'boolean', 'array']),
  required: z.boolean(),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  options: z.array(z.string()).optional(),
});

const CreatePromptSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  template: z.string().min(1).max(10000),
  variables: z.array(VariableSchema),
});

const PromptsQuerySchema = z.object({
  page: z.preprocess(
    val => (val === null ? undefined : val),
    z.coerce.number().min(1).default(1)
  ),
  limit: z.preprocess(
    val => (val === null ? undefined : val),
    z.coerce.number().min(1).max(100).default(20)
  ),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  let user: any = null;
  let query: any = null;

  try {
    user = await requireAuth();
    const { searchParams } = new URL(request.url);

    query = PromptsQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    });

    // Use optimized query with caching for better performance
    const result = await getUserPrompts(user.id, {
      ...query,
      select: {
        lightweight: query.limit > 10, // Use lightweight for large result sets
        enableCache: true, // Enable caching for list queries
        includeExecutionCount: true, // Include execution count for dashboard
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    // Enhanced error logging for debugging
    console.error('API Prompts GET Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: user?.id,
      query: query,
      timestamp: new Date().toISOString(),
      type: error?.constructor?.name,
      code: (error as any)?.code,
      url: request.url,
    });

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

    // Database-specific error handling
    const errorCode = (error as any)?.code;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Prisma connection errors
    if (
      errorCode === 'P1001' ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')
    ) {
      return NextResponse.json(
        {
          error:
            'Database connection temporarily unavailable. Please try again.',
          code: 'DB_CONNECTION_ERROR',
          retryable: true,
        },
        { status: 503 }
      );
    }

    // Prisma query errors
    if (typeof errorCode === 'string' && errorCode.startsWith('P')) {
      return NextResponse.json(
        {
          error: 'Database query error. Please try again.',
          code: 'DB_QUERY_ERROR',
          retryable: true,
        },
        { status: 500 }
      );
    }

    // Authentication errors from requireAuth
    if (
      errorMessage.includes('Authentication failed') ||
      errorMessage.includes('session missing')
    ) {
      return NextResponse.json(
        {
          error: 'Authentication session invalid',
          code: 'AUTH_SESSION_INVALID',
        },
        { status: 401 }
      );
    }

    // Generic server error with retry indication
    return NextResponse.json(
      {
        error: 'Internal server error. Please try again.',
        code: 'INTERNAL_ERROR',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const data = CreatePromptSchema.parse(body);

    // Auto-detect variables from template if variables array is empty
    if (data.variables.length === 0) {
      const variableNames = extractVariablesFromTemplate(data.template);
      data.variables = variableNames.map(name => ({
        name,
        type: 'string' as const,
        required: true,
      }));
    }

    const prompt = await createPrompt(user.id, data);

    return NextResponse.json(prompt, { status: 201 });
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
