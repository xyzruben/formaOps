import { prisma } from './client';
import type {
  Execution,
  PromptStatus,
  ExecutionStatus,
} from '@prisma/client';

// User queries
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const createUser = async (data: {
  email: string;
  name?: string;
}) => {
  return prisma.user.create({
    data,
  });
};

// Prompt queries
export const getUserPrompts = async (
  userId: string,
  {
    page = 1,
    limit = 20,
    status,
    search,
  }: {
    page?: number;
    limit?: number;
    status?: PromptStatus;
    search?: string;
  } = {}
) => {
  const where = {
    userId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [prompts, total] = await Promise.all([
    prisma.prompt.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.prompt.count({ where }),
  ]);

  return {
    prompts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPromptById = async (id: string, userId: string) => {
  return prisma.prompt.findFirst({
    where: { id, userId },
    include: {
      validations: true,
      _count: {
        select: {
          executions: true,
          versions: true,
        },
      },
    },
  });
};

export const createPrompt = async (
  userId: string,
  data: {
    name: string;
    description?: string;
    template: string;
    variables: any;
    status?: PromptStatus;
    tags?: string[];
  }
) => {
  return prisma.prompt.create({
    data: {
      ...data,
      userId,
    },
  });
};

export const updatePrompt = async (
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    description: string;
    template: string;
    variables: any;
    status: PromptStatus;
    tags: string[];
  }>
) => {
  return prisma.prompt.updateMany({
    where: { id, userId },
    data: {
      ...data,
      updatedAt: new Date(),
      ...(data.status === 'PUBLISHED' && { publishedAt: new Date() }),
    },
  });
};

export const deletePrompt = async (id: string, userId: string) => {
  return prisma.prompt.deleteMany({
    where: { id, userId },
  });
};

// Execution queries
export const getUserExecutions = async (
  userId: string,
  {
    page = 1,
    limit = 20,
    status,
    promptId,
    from,
    to,
  }: {
    page?: number;
    limit?: number;
    status?: ExecutionStatus;
    promptId?: string;
    from?: Date;
    to?: Date;
  } = {}
) => {
  const where = {
    userId,
    ...(status && { status }),
    ...(promptId && { promptId }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }
      : {}),
  };

  const [executions, total] = await Promise.all([
    prisma.execution.findMany({
      where,
      select: {
        id: true,
        status: true,
        inputs: true,
        output: true,
        validationStatus: true,
        latencyMs: true,
        tokenUsage: true,
        costUsd: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        prompt: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.execution.count({ where }),
  ]);

  return {
    executions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Removed old getExecutionById - replaced with new version in Task 6 functions

export const createExecution = async (
  userId: string,
  promptId: string,
  data: {
    inputs: Record<string, any>;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    model?: string;
  }
) => {
  return prisma.execution.create({
    data: {
      userId,
      promptId,
      inputs: data.inputs,
      priority: data.priority || 'NORMAL',
      status: 'PENDING',
    },
  });
};

export const updateExecution = async (
  id: string,
  data: Partial<{
    status: ExecutionStatus;
    output: string;
    validatedOutput: any;
    validationStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
    latencyMs: number;
    costUsd: number;
    tokenUsage: any;
    startedAt: Date;
    completedAt: Date;
  }>
) => {
  return prisma.execution.update({
    where: { id },
    data,
  });
};

// Task 6: New execution history functions
export interface ExecutionFilters {
  userId: string;
  promptId?: string;
  status?: ExecutionStatus;
  dateRange?: { from: Date; to: Date };
  page?: number;
  limit?: number;
}

export interface PaginatedExecutions {
  executions: ExecutionWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExecutionWithDetails {
  id: string;
  status: ExecutionStatus;
  inputs: any;
  output: string | null;
  validationStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  latencyMs: number | null;
  costUsd: number | null;
  tokenUsage: any;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  prompt: {
    id: string;
    name: string;
  };
  logs?: Array<{
    id: string;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    message: string;
    timestamp: Date;
  }>;
}

export async function getExecutionHistory(filters: ExecutionFilters): Promise<PaginatedExecutions> {
  const { userId, promptId, status, dateRange, page = 1, limit = 20 } = filters;
  
  // Validate pagination parameters
  const validatedPage = Math.max(1, page);
  const validatedLimit = Math.min(100, Math.max(1, limit));
  
  // Build where clause
  const where = {
    userId,
    ...(promptId && { promptId }),
    ...(status && { status }),
    ...(dateRange && {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    }),
  };

  // Execute queries in parallel
  const [executions, total] = await Promise.all([
    prisma.execution.findMany({
      where,
      select: {
        id: true,
        status: true,
        inputs: true,
        output: true,
        validationStatus: true,
        latencyMs: true,
        costUsd: true,
        tokenUsage: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        prompt: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (validatedPage - 1) * validatedLimit,
      take: validatedLimit,
    }),
    prisma.execution.count({ where }),
  ]);

  const totalPages = Math.ceil(total / validatedLimit);

  return {
    executions: executions.map(exec => ({
      ...exec,
      costUsd: exec.costUsd?.toNumber() || null,
    })) as ExecutionWithDetails[],
    pagination: {
      page: validatedPage,
      limit: validatedLimit,
      total,
      totalPages,
    },
  };
}

export async function getExecutionById(id: string, userId: string): Promise<ExecutionWithDetails | null> {
  // Validate execution exists and user owns it
  const execution = await prisma.execution.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      inputs: true,
      output: true,
      validationStatus: true,
      latencyMs: true,
      costUsd: true,
      tokenUsage: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      prompt: {
        select: {
          id: true,
          name: true,
        },
      },
      logs: {
        select: {
          id: true,
          level: true,
          message: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!execution) {
    return null;
  }

  return {
    ...execution,
    costUsd: execution.costUsd?.toNumber() || null,
  } as ExecutionWithDetails;
}

export async function retryExecution(executionId: string, userId: string): Promise<Execution> {
  // Validate execution exists and user owns it
  const existingExecution = await prisma.execution.findFirst({
    where: { id: executionId, userId },
    include: { prompt: true },
  });

  if (!existingExecution) {
    throw new Error('Execution not found');
  }

  // Validate execution can be retried (must be in FAILED state)
  if (existingExecution.status !== 'FAILED') {
    throw new Error('Only failed executions can be retried');
  }

  // Create new execution with same parameters
  const newExecution = await prisma.execution.create({
    data: {
      userId,
      promptId: existingExecution.promptId,
      inputs: existingExecution.inputs || {},
      priority: existingExecution.priority,
      status: 'PENDING',
    },
  });

  return newExecution;
}

// Additional helper functions
export async function getExecutionStats(userId: string, dateRange?: { from: Date; to: Date }) {
  const where = {
    userId,
    ...(dateRange && {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    }),
  };

  const [total, completed, failed, pending] = await Promise.all([
    prisma.execution.count({ where }),
    prisma.execution.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.execution.count({ where: { ...where, status: 'FAILED' } }),
    prisma.execution.count({ where: { ...where, status: 'PENDING' } }),
  ]);

  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    failed,
    pending,
    successRate,
  };
}

export async function deleteExecution(executionId: string, userId: string): Promise<void> {
  // Verify user owns the execution
  const execution = await prisma.execution.findFirst({
    where: { id: executionId, userId },
  });

  if (!execution) {
    throw new Error('Execution not found');
  }

  // Delete execution (cascade will handle logs and results)
  await prisma.execution.delete({
    where: { id: executionId },
  });
}