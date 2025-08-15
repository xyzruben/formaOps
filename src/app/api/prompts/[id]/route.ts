import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { getPromptById, updatePrompt, deletePrompt } from '@/lib/database/queries';

const VariableSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid variable name'),
  type: z.enum(['string', 'number', 'boolean', 'array']),
  required: z.boolean(),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  options: z.array(z.string()).optional(),
});

const UpdatePromptSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  template: z.string().min(1).max(10000).optional(),
  variables: z.array(VariableSchema).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  try {
    const user = await requireAuth();
    const { id } = params;

    const prompt = await getPromptById(id, user.id);

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(prompt);
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  try {
    const user = await requireAuth();
    const { id } = params;
    const body = await request.json();
    
    const data = UpdatePromptSchema.parse(body);

    const result = await updatePrompt(id, user.id, data);

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Prompt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch updated prompt
    const updatedPrompt = await getPromptById(id, user.id);
    
    return NextResponse.json(updatedPrompt);
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  try {
    const user = await requireAuth();
    const { id } = params;

    const result = await deletePrompt(id, user.id);

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Prompt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Prompt deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}