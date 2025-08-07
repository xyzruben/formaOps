import { prisma } from './client';
import type {
  Prompt,
  Execution,
  PromptStatus,
  ExecutionStatus,
  VariableDefinition,
  CreatePromptRequest,
  UpdatePromptRequest,
  ExecutePromptRequest,
} from '@/types';

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
  data: CreatePromptRequest
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
  data: UpdatePromptRequest
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

export const getExecutionById = async (id: string, userId: string) => {
  return prisma.execution.findFirst({
    where: { id, userId },
    include: {
      prompt: {
        select: {
          id: true,
          name: true,
          template: true,
        },
      },
      logs: {
        orderBy: { timestamp: 'desc' },
        take: 50,
      },
    },
  });
};

export const createExecution = async (
  userId: string,
  promptId: string,
  data: ExecutePromptRequest
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