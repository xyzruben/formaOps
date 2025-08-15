import type { 
  User, 
  Prompt, 
  PromptVersion, 
  Execution, 
  ExecutionLog,
  Validation, 
  ApiKey,
  UserPlan,
  PromptStatus,
  ExecutionStatus,
  ValidationStatus,
  Priority,
  ValidationType,
  LogLevel
} from '@prisma/client';

// Base database types
export type {
  User,
  Prompt,
  PromptVersion,
  Execution,
  ExecutionLog,
  Validation,
  ApiKey,
  UserPlan,
  PromptStatus,
  ExecutionStatus,
  ValidationStatus,
  Priority,
  ValidationType,
  LogLevel,
};

// Extended types with relations
export type PromptWithRelations = Prompt & {
  user: User;
  executions: Execution[];
  validations: Validation[];
  versions: PromptVersion[];
  _count: {
    executions: number;
    versions: number;
  };
};

export type ExecutionWithRelations = Execution & {
  user: User;
  prompt: Prompt;
  logs: ExecutionLog[];
};

export type PromptListItem = Pick<Prompt, 'id' | 'name' | 'description' | 'status' | 'createdAt' | 'updatedAt'> & {
  _count: {
    executions: number;
  };
};

export type ExecutionListItem = Pick<
  Execution, 
  'id' | 'status' | 'latencyMs' | 'costUsd' | 'createdAt' | 'validationStatus'
> & {
  prompt: Pick<Prompt, 'id' | 'name'>;
};

// Variable definitions
export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description?: string | undefined;
  defaultValue?: unknown | undefined;
  options?: string[] | undefined;
}

// Validation configurations
export interface SchemaValidationConfig {
  type: 'object';
  required?: string[];
  properties: Record<string, unknown>;
}

export interface RegexValidationConfig {
  pattern: string;
  flags?: string;
  description?: string;
}

export interface FunctionValidationConfig {
  code: string;
  timeout?: number;
  description?: string;
}

export type ValidationConfig = 
  | SchemaValidationConfig 
  | RegexValidationConfig 
  | FunctionValidationConfig;

// Token usage tracking
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  model?: string;
}

// Execution context
export interface ExecutionContext {
  userId: string;
  promptId: string;
  inputs: Record<string, unknown>;
  priority?: Priority;
  validateOutput?: boolean;
}

// API response types
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Error types
export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}