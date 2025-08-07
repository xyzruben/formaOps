import type {
  VariableDefinition,
  ValidationConfig,
  TokenUsage,
  PaginationInfo,
} from './database';
import type {
  PromptStatus,
  ExecutionStatus,
  ValidationStatus,
  Priority,
  ValidationType,
  LogLevel,
} from '@prisma/client';

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  access_token: string;
  refresh_token: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

// Prompt Management
export interface CreatePromptRequest {
  name: string;
  description?: string;
  template: string;
  variables: VariableDefinition[];
  validations?: ValidationRule[];
}

export interface UpdatePromptRequest {
  name?: string;
  description?: string;
  template?: string;
  variables?: VariableDefinition[];
  validations?: ValidationRule[];
  status?: PromptStatus;
}

export interface ValidationRule {
  type: ValidationType;
  name: string;
  config: ValidationConfig;
  isActive: boolean;
}

export interface PromptResponse {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: VariableDefinition[];
  validations: ValidationRule[];
  status: PromptStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    executions: number;
    versions: number;
  };
}

export interface PromptsQuery {
  page?: number;
  limit?: number;
  status?: PromptStatus;
  search?: string;
}

export interface PromptsResponse {
  prompts: {
    id: string;
    name: string;
    description: string | null;
    status: PromptStatus;
    createdAt: string;
    updatedAt: string;
    _count: {
      executions: number;
    };
  }[];
  pagination: PaginationInfo;
}

// Execution Management
export interface ExecutePromptRequest {
  inputs: Record<string, unknown>;
  priority?: Priority;
  validateOutput?: boolean;
}

export interface ExecuteResponse {
  executionId: string;
  status: 'PENDING';
  estimatedTime: number;
}

export interface ExecutionsQuery {
  page?: number;
  limit?: number;
  status?: ExecutionStatus;
  promptId?: string;
  from?: string;
  to?: string;
}

export interface ExecutionsResponse {
  executions: {
    id: string;
    status: ExecutionStatus;
    inputs: Record<string, unknown>;
    output: string | null;
    validationStatus: ValidationStatus;
    latencyMs: number | null;
    tokenUsage: TokenUsage | null;
    costUsd: number | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    prompt: {
      id: string;
      name: string;
    };
  }[];
  pagination: PaginationInfo;
}

export interface ExecutionDetailResponse {
  id: string;
  status: ExecutionStatus;
  priority: Priority;
  inputs: Record<string, unknown>;
  output: string | null;
  validatedOutput: unknown | null;
  validationStatus: ValidationStatus;
  validationErrors: string[] | null;
  latencyMs: number | null;
  tokenUsage: TokenUsage | null;
  costUsd: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  prompt: {
    id: string;
    name: string;
    template: string;
  };
  logs: {
    id: string;
    level: LogLevel;
    message: string;
    timestamp: string;
  }[];
}

export interface RetryResponse {
  executionId: string;
  originalId: string;
  status: 'PENDING';
}

// WebSocket Events
export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

export interface ExecutionStatusEvent {
  type: 'execution.status';
  data: {
    executionId: string;
    status: ExecutionStatus;
    progress?: number;
    latencyMs?: number;
    error?: string;
  };
}

export interface ExecutionCompletedEvent {
  type: 'execution.completed';
  data: {
    executionId: string;
    output: string;
    validationStatus: ValidationStatus;
    tokenUsage: TokenUsage;
    costUsd: number;
    latencyMs: number;
  };
}

export interface SystemStatusEvent {
  type: 'system.status';
  data: {
    healthy: boolean;
    services: {
      database: boolean;
      openai: boolean;
      validation: boolean;
    };
  };
}

// System endpoints
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
    };
    openai: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
    };
    validation: {
      status: 'healthy' | 'unhealthy';
    };
  };
}

export interface MetricsResponse {
  executions: {
    total: number;
    today: number;
    successRate: number;
    avgLatency: number;
  };
  costs: {
    totalUsd: number;
    todayUsd: number;
    avgCostPerExecution: number;
  };
  users: {
    active: number;
    totalExecutions: number;
  };
}

// Error responses
export interface ValidationError {
  error: 'Validation failed';
  code: 'VALIDATION_ERROR';
  details: {
    field: string;
    message: string;
  }[];
}

export interface ExecutionError {
  error: 'Invalid input variables';
  code: 'INVALID_INPUTS';
  details: {
    variable: string;
    expected: string;
    received: string;
  }[];
}

export interface QuotaError {
  error: 'Daily usage quota exceeded';
  code: 'QUOTA_EXCEEDED';
  resetTime: string;
}

export interface NotFoundError {
  error: 'Prompt not found';
  code: 'NOT_FOUND';
}

export interface ConflictError {
  error: 'Cannot delete prompt with active executions';
  code: 'CONFLICT';
}

export interface UnauthorizedError {
  error: 'Unauthorized';
  code: 'UNAUTHORIZED';
}

export interface RetryError {
  error: 'Cannot retry successful execution';
  code: 'INVALID_RETRY';
}

// Error codes enum
export enum ErrorCodes {
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUTS = 'INVALID_INPUTS',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INVALID_RETRY = 'INVALID_RETRY',
}