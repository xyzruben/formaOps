# API Specification

## Base Configuration

**Base URL:** `/api`  
**Content-Type:** `application/json`  
**Authentication:** Bearer token via `Authorization` header  
**Rate Limiting:** 100 requests/minute per user

## Authentication Endpoints

### POST /auth/login
```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
}

// Response 200
interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  access_token: string;
  refresh_token: string;
}

// Error 401
interface AuthError {
  error: "Invalid credentials";
  code: "INVALID_CREDENTIALS";
}
```

### POST /auth/logout
```typescript
// Request: No body (token in header)
// Response 200
interface LogoutResponse {
  message: "Logged out successfully";
}
```

### GET /auth/me
```typescript
// Response 200
interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

// Error 401
interface UnauthorizedError {
  error: "Unauthorized";
  code: "UNAUTHORIZED";
}
```

## Prompt Management

### GET /prompts
```typescript
// Query Parameters
interface PromptsQuery {
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  search?: string;      // Search name/description
}

// Response 200
interface PromptsResponse {
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
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### POST /prompts
```typescript
// Request
interface CreatePromptRequest {
  name: string;                    // Min: 1, Max: 100
  description?: string;            // Max: 500
  template: string;                // Min: 1, Max: 10000
  variables: VariableDefinition[];
  validations?: ValidationRule[];
}

interface VariableDefinition {
  name: string;                    // /^[a-zA-Z_][a-zA-Z0-9_]*$/
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
  options?: string[];              // For enum-like values
}

interface ValidationRule {
  type: 'schema' | 'regex' | 'function';
  name: string;
  config: Record<string, any>;
  isActive: boolean;
}

// Response 201
interface CreatePromptResponse {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: VariableDefinition[];
  status: 'DRAFT';
  version: 1;
  createdAt: string;
}

// Error 400
interface ValidationError {
  error: "Validation failed";
  code: "VALIDATION_ERROR";
  details: {
    field: string;
    message: string;
  }[];
}
```

### GET /prompts/:id
```typescript
// Response 200
interface PromptResponse {
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

// Error 404
interface NotFoundError {
  error: "Prompt not found";
  code: "NOT_FOUND";
}
```

### PUT /prompts/:id
```typescript
// Request (same as CreatePromptRequest but all fields optional)
interface UpdatePromptRequest {
  name?: string;
  description?: string;
  template?: string;
  variables?: VariableDefinition[];
  validations?: ValidationRule[];
  status?: PromptStatus;
}

// Response 200 (same as PromptResponse)
```

### DELETE /prompts/:id
```typescript
// Response 200
interface DeleteResponse {
  message: "Prompt deleted successfully";
}

// Error 409
interface ConflictError {
  error: "Cannot delete prompt with active executions";
  code: "CONFLICT";
}
```

## Execution Management

### POST /prompts/:id/execute
```typescript
// Request
interface ExecutePromptRequest {
  inputs: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  validateOutput?: boolean;        // Default: true
}

// Response 202 (Accepted - async processing)
interface ExecuteResponse {
  executionId: string;
  status: 'PENDING';
  estimatedTime: number;           // Seconds
}

// Error 400
interface ExecutionError {
  error: "Invalid input variables";
  code: "INVALID_INPUTS";
  details: {
    variable: string;
    expected: string;
    received: string;
  }[];
}

// Error 402
interface QuotaError {
  error: "Daily usage quota exceeded";
  code: "QUOTA_EXCEEDED";
  resetTime: string;
}
```

### GET /executions
```typescript
// Query Parameters
interface ExecutionsQuery {
  page?: number;
  limit?: number;
  status?: ExecutionStatus;
  promptId?: string;
  from?: string;                   // ISO date
  to?: string;                     // ISO date
}

// Response 200
interface ExecutionsResponse {
  executions: {
    id: string;
    status: ExecutionStatus;
    inputs: Record<string, any>;
    output: string | null;
    validationStatus: ValidationStatus;
    latencyMs: number | null;
    tokenUsage: {
      input: number;
      output: number;
      total: number;
    } | null;
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
```

### GET /executions/:id
```typescript
// Response 200
interface ExecutionDetailResponse {
  id: string;
  status: ExecutionStatus;
  priority: Priority;
  inputs: Record<string, any>;
  output: string | null;
  validatedOutput: any | null;
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
```

### POST /executions/:id/retry
```typescript
// Request: No body
// Response 202
interface RetryResponse {
  executionId: string;              // New execution ID
  originalId: string;
  status: 'PENDING';
}

// Error 409
interface RetryError {
  error: "Cannot retry successful execution";
  code: "INVALID_RETRY";
}
```

## Real-time WebSocket Events

### Connection
```typescript
// Connect to: ws://localhost:3000/api/ws
// Auth: ?token=<jwt_token>

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}
```

### Execution Status Updates
```typescript
interface ExecutionStatusEvent {
  type: 'execution.status';
  data: {
    executionId: string;
    status: ExecutionStatus;
    progress?: number;              // 0-100 for RUNNING status
    latencyMs?: number;
    error?: string;
  };
}

interface ExecutionCompletedEvent {
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
```

### System Events
```typescript
interface SystemStatusEvent {
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
```

## System Endpoints

### GET /health
```typescript
// Response 200
interface HealthResponse {
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
```

### GET /metrics
```typescript
// Response 200 (requires admin role)
interface MetricsResponse {
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
```

## Error Handling Standards

### Standard Error Response
```typescript
interface ApiError {
  error: string;                   // Human-readable message
  code: string;                    // Machine-readable code
  details?: any;                   // Additional context
  timestamp: string;
  requestId: string;
}
```

### Error Codes
```typescript
enum ErrorCodes {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUTS = 'INVALID_INPUTS',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // Quota & Limits
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

### HTTP Status Code Mapping
```
200: Success
201: Created
202: Accepted (async operations)
400: Bad Request (validation errors)
401: Unauthorized
403: Forbidden
404: Not Found
409: Conflict
429: Too Many Requests
500: Internal Server Error
503: Service Unavailable
```

## Type Definitions

```typescript
enum PromptStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING', 
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

enum ValidationStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

This API specification provides complete contract definition for frontend-backend integration while maintaining simplicity and clear error handling patterns.