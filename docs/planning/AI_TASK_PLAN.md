# AI Implementation Task Plan - 18 Micro-Tasks

## Overview

This document breaks down the AI Features Implementation Plan into 18 specific, implementable micro-tasks. Each task is designed to be self-contained with clear inputs/outputs, file-specific details, and integration points to prevent AI hallucinations during implementation.

---

## **Phase 1: Core AI Engine (Tasks 1-8)**

### **Task 1: Implement OpenAI Client Integration**
**Dependencies:** None

**Technical Specifications:**
- **File Path:** `src/lib/openai/client.ts`
- **Dependencies:** `openai` (already in package.json), `@/lib/monitoring/cost-tracker`, `@/lib/monitoring/logger`
- **Interfaces:**
```typescript
interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens: number;
  temperature: number;
}

interface ExecutionResult {
  output: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  model: string;
}
```

**Integration Points:**
- Connect to existing cost tracking system in `src/lib/monitoring/cost-tracker.ts`
- Use existing logger in `src/lib/monitoring/logger.ts`
- Follow existing error handling patterns from `src/lib/utils/error-handler.ts`

**Database Changes:** None

**API Specifications:** Internal library, no API changes

**Validation Logic:**
- Validate API key format (starts with 'sk-')
- Validate model is supported OpenAI model
- Validate maxTokens is between 1-4000
- Validate temperature is between 0-2

**Success Criteria:**
- OpenAI API calls execute successfully
- Token usage tracking works
- Cost calculation integrates with existing monitoring
- Error handling prevents application crashes

---

### **Task 2: Implement Template Engine with Variable Injection**
**Dependencies:** Task 1

**Technical Specifications:**
- **File Path:** `src/lib/prompts/template-engine.ts`
- **Dependencies:** `@/types/database` (existing Prisma types), `zod`
- **Interfaces:**
```typescript
interface TemplateVariable {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

interface TemplateResult {
  processedTemplate: string;
  missingVariables: string[];
  isValid: boolean;
}
```

**Integration Points:**
- Use existing `Prompt` type from `src/types/database.ts`
- Integrate with existing variable definitions in database schema
- Connect to validation system patterns

**Database Changes:** None (uses existing `variables` JSON field in `prompts` table)

**API Specifications:** Internal library, no API changes

**Validation Logic:**
- Check all required variables are provided
- Validate variable types match expected types
- Sanitize template for injection attacks
- Validate handlebars syntax {{variable}}

**Success Criteria:**
- Variables inject correctly into templates
- Missing variables are identified
- Type validation prevents runtime errors
- Template syntax validation works

---

### **Task 3: Update Database Schema for AI Execution**
**Dependencies:** None

**Technical Specifications:**
- **File Path:** `prisma/schema.prisma`
- **Dependencies:** Existing Prisma schema
- **Schema Changes:**
```prisma
model Execution {
  // Add new fields to existing model
  model          String?         @default("gpt-3.5-turbo")
  totalTokens    Int?
  inputTokens    Int?
  outputTokens   Int?
  costUsd        Decimal?        @db.Decimal(10,6)
  rawOutput      String?
  validationStatus ValidationStatus @default(PENDING)
  validationErrors Json?
  
  // Add relation to results
  results        ExecutionResult[]
}

model ExecutionResult {
  id           String    @id @default(uuid())
  executionId  String
  execution    Execution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  rawOutput    String
  tokenUsage   Json
  costUsd      Decimal   @db.Decimal(10,6)
  createdAt    DateTime  @default(now())
  
  @@map("execution_results")
}

enum ValidationStatus {
  PENDING
  PASSED  
  FAILED
  SKIPPED
}
```

**Integration Points:**
- Extend existing `Execution` model
- Maintain existing relationships with `User` and `Prompt`
- Add indexes for performance queries

**Database Changes:** 
- Add columns to existing `executions` table
- Create new `execution_results` table
- Add `ValidationStatus` enum

**Success Criteria:**
- Schema migration runs without errors
- Existing data remains intact
- New fields are queryable
- Performance indexes work correctly

---

### **Task 4: Create Prompt Execution API Endpoint**
**Dependencies:** Tasks 1, 2, 3

**Technical Specifications:**
- **File Path:** `src/app/api/prompts/[id]/execute/route.ts`
- **Dependencies:** `@/lib/openai/client`, `@/lib/prompts/template-engine`, `@/lib/database/client`, `@/lib/auth/server`
- **Interfaces:**
```typescript
interface ExecuteRequest {
  inputs: Record<string, any>;
  model?: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens?: number;
  temperature?: number;
}

interface ExecuteResponse {
  executionId: string;
  status: 'COMPLETED' | 'FAILED';
  output?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd?: number;
  error?: string;
}
```

**Integration Points:**
- Use existing authentication from `src/lib/auth/server.ts`
- Follow existing API route patterns in `src/app/api/`
- Use existing database client from `src/lib/database/client.ts`
- Integrate with Prisma types from `src/types/database.ts`

**Database Changes:** None (uses schema from Task 3)

**API Specifications:**
- **Method:** POST
- **Path:** `/api/prompts/[id]/execute`
- **Auth:** Required (Bearer token)
- **Request:** JSON body with ExecuteRequest
- **Response:** 200 (success), 400 (validation), 401 (auth), 404 (not found), 500 (server error)

**Validation Logic:**
- Validate user owns the prompt
- Validate required inputs are provided
- Validate model parameters are within limits
- Validate prompt exists and is not archived

**Success Criteria:**
- API executes prompts successfully
- Results are stored in database
- Authentication works correctly
- Error responses follow existing patterns

---

### **Task 5: Implement Cost Tracking Integration**
**Dependencies:** Task 1

**Technical Specifications:**
- **File Path:** `src/lib/monitoring/cost-tracker.ts` (extend existing)
- **Dependencies:** Existing cost-tracker implementation
- **New Methods:**
```typescript
interface TokenCosts {
  inputCostPer1k: number;
  outputCostPer1k: number;
  model: string;
}

class CostTracker {
  // Add new methods to existing class
  calculateOpenAICost(tokens: TokenUsage, model: string): number
  trackExecution(executionId: string, cost: number, tokens: TokenUsage): Promise<void>
  getExecutionCosts(userId: string, dateRange?: DateRange): Promise<CostSummary>
}
```

**Integration Points:**
- Extend existing `CostTracker` class
- Use existing database patterns
- Connect to existing monitoring infrastructure

**Database Changes:** None (uses existing tracking tables)

**API Specifications:** Internal library, no API changes

**Validation Logic:**
- Validate token counts are positive integers
- Validate model exists in cost configuration
- Validate cost calculations are reasonable

**Success Criteria:**
- Cost calculations are accurate
- Integration with existing monitoring works
- Database tracking functions correctly
- API can query cost data

---

### **Task 6: Create Execution History Database Queries**
**Dependencies:** Task 3

**Technical Specifications:**
- **File Path:** `src/lib/database/queries.ts` (extend existing)
- **Dependencies:** `@prisma/client`, existing query patterns
- **New Functions:**
```typescript
interface ExecutionFilters {
  userId: string;
  promptId?: string;
  status?: ExecutionStatus;
  dateRange?: { from: Date; to: Date };
  page?: number;
  limit?: number;
}

interface PaginatedExecutions {
  executions: ExecutionWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Add to existing queries
export async function getExecutionHistory(filters: ExecutionFilters): Promise<PaginatedExecutions>
export async function getExecutionById(id: string, userId: string): Promise<ExecutionWithDetails | null>
export async function retryExecution(executionId: string, userId: string): Promise<Execution>
```

**Integration Points:**
- Extend existing `queries.ts` file
- Use existing Prisma client patterns
- Follow existing pagination patterns
- Use existing auth validation patterns

**Database Changes:** None (uses schema from Task 3)

**API Specifications:** Internal library, no API changes

**Validation Logic:**
- Validate user can only access own executions
- Validate pagination parameters
- Validate date ranges are logical
- Validate execution exists before retry

**Success Criteria:**
- Queries return correct data
- Pagination works efficiently
- Authorization is enforced
- Performance is acceptable

---

### **Task 7: Create Basic JSON Schema Validation System**
**Dependencies:** Task 3

**Technical Specifications:**
- **File Path:** `src/lib/validation/schema-validator.ts`
- **Dependencies:** `zod`, `@/lib/database/client`
- **Interfaces:**
```typescript
interface ValidationRule {
  id: string;
  name: string;
  type: 'json_schema';
  schema: object;
  isActive: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validatedData?: any;
}

class SchemaValidator {
  validateOutput(output: string, rules: ValidationRule[]): Promise<ValidationResult>
  createValidationRule(promptId: string, rule: Omit<ValidationRule, 'id'>): Promise<ValidationRule>
}
```

**Integration Points:**
- Connect to existing database patterns
- Use existing error handling
- Integrate with execution flow

**Database Changes:**
```sql
CREATE TABLE validation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid REFERENCES prompts(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  type varchar(20) NOT NULL DEFAULT 'json_schema',
  schema jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
```

**API Specifications:** Internal library, no API changes

**Validation Logic:**
- Validate JSON schema is valid
- Validate output is parseable JSON (for schema validation)
- Handle validation errors gracefully
- Support multiple validation rules per prompt

**Success Criteria:**
- Schema validation works correctly
- Validation results are stored
- Integration with executions works
- Error handling is robust

---

### **Task 8: Create Execution Results API Endpoints**
**Dependencies:** Tasks 4, 6

**Technical Specifications:**
- **File Path:** `src/app/api/executions/route.ts`
- **Dependencies:** `@/lib/database/queries`, `@/lib/auth/server`
- **API Endpoints:**
```typescript
// GET /api/executions
interface ExecutionsQuery {
  promptId?: string;
  status?: ExecutionStatus;
  page?: string;
  limit?: string;
  from?: string;
  to?: string;
}

// GET /api/executions/[id]
interface ExecutionDetailResponse {
  execution: ExecutionWithDetails;
  canRetry: boolean;
}

// POST /api/executions/[id]/retry
interface RetryResponse {
  newExecutionId: string;
  originalExecutionId: string;
}
```

**Integration Points:**
- Use queries from Task 6
- Follow existing API patterns
- Use existing authentication
- Match existing response formats

**Database Changes:** None

**API Specifications:**
- **GET /api/executions**: Query parameters for filtering, pagination
- **GET /api/executions/[id]**: Get single execution details
- **POST /api/executions/[id]/retry**: Retry failed execution
- **Auth:** All endpoints require authentication
- **Status Codes:** 200, 400, 401, 404, 500

**Validation Logic:**
- Validate query parameters
- Validate user owns executions
- Validate execution can be retried
- Validate pagination limits

**Success Criteria:**
- API returns correct execution data
- Filtering and pagination work
- Retry functionality works
- Authentication is enforced

---

## **Phase 2: User Interface (Tasks 9-14)**

### **Task 9: Create Execution Panel Component**
**Dependencies:** Task 4

**Technical Specifications:**
- **File Path:** `src/components/execution/execution-panel.tsx`
- **Dependencies:** `@/components/ui/button`, `@/components/ui/input`, `@/lib/hooks/use-prompts`, `react-hook-form`, `zod`
- **Component Interface:**
```typescript
interface ExecutionPanelProps {
  prompt: Prompt;
  onExecutionComplete?: (result: ExecutionResult) => void;
}

interface ExecutionForm {
  inputs: Record<string, any>;
  model: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens: number;
  temperature: number;
}
```

**Integration Points:**
- Use existing UI components from `src/components/ui/`
- Follow existing form patterns
- Use existing loading states
- Connect to API from Task 4

**Database Changes:** None

**API Specifications:** Uses existing execution API

**Validation Logic:**
- Validate all required variables are provided
- Validate variable types match prompt definition
- Validate model parameters are within bounds
- Show validation errors inline

**Success Criteria:**
- Form generates correctly from prompt variables
- Execution calls API successfully
- Loading states work properly
- Results display correctly

---

### **Task 10: Create Execution History Component**
**Dependencies:** Task 8

**Technical Specifications:**
- **File Path:** `src/components/execution/execution-history.tsx`
- **Dependencies:** `@/components/ui/table`, `@/components/ui/badge`, `@/hooks/use-executions`, `date-fns`
- **Component Interface:**
```typescript
interface ExecutionHistoryProps {
  promptId?: string;
  userId: string;
  onExecutionSelect?: (execution: Execution) => void;
}

interface ExecutionListItem {
  id: string;
  status: ExecutionStatus;
  createdAt: Date;
  tokenUsage?: TokenUsage;
  costUsd?: number;
  hasError: boolean;
}
```

**Integration Points:**
- Use existing table components
- Follow existing pagination patterns
- Use existing date formatting utilities
- Connect to executions API from Task 8

**Database Changes:** None

**API Specifications:** Uses existing executions API

**Validation Logic:**
- Handle loading states
- Handle empty states
- Handle error states
- Validate pagination parameters

**Success Criteria:**
- History displays correctly
- Pagination works
- Filtering by prompt works
- Click to view details works

---

### **Task 11: Create Results Viewer Component**
**Dependencies:** Task 8

**Technical Specifications:**
- **File Path:** `src/components/execution/results-viewer.tsx`
- **Dependencies:** `@/components/ui/card`, `@/components/ui/textarea`, `@/lib/utils`, `react-syntax-highlighter`
- **Component Interface:**
```typescript
interface ResultsViewerProps {
  execution: ExecutionWithDetails;
  onRetry?: () => void;
}

interface ExecutionMetrics {
  tokenUsage: TokenUsage;
  costUsd: number;
  latencyMs: number;
  model: string;
}
```

**Integration Points:**
- Use existing card components for layout
- Use existing button components for actions
- Follow existing typography patterns
- Connect to retry API from Task 8

**Database Changes:** None

**API Specifications:** Uses existing execution detail API

**Validation Logic:**
- Handle different output formats (text, JSON)
- Handle validation errors display
- Handle retry button state
- Format costs and metrics properly

**Success Criteria:**
- Results display with proper formatting
- Metrics show accurately
- Retry functionality works
- Error states are handled

---

### **Task 12: Create Simple Analytics Dashboard**
**Dependencies:** Task 5

**Technical Specifications:**
- **File Path:** `src/components/analytics/simple-dashboard.tsx`
- **Dependencies:** `@/components/ui/card`, `@/lib/monitoring/cost-tracker`, `recharts`, `date-fns`
- **Component Interface:**
```typescript
interface DashboardProps {
  userId: string;
  dateRange?: { from: Date; to: Date };
}

interface DashboardMetrics {
  totalExecutions: number;
  successRate: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  executionsToday: number;
  mostUsedPrompt: string;
}
```

**Integration Points:**
- Use existing card components for metrics
- Use cost tracking from Task 5
- Follow existing chart patterns (if any)
- Use existing date range picker (if available)

**Database Changes:** None

**API Specifications:**
```typescript
// Add to existing API
GET /api/analytics/dashboard?from=2024-01-01&to=2024-01-31
```

**Validation Logic:**
- Validate date ranges are logical
- Handle empty data states
- Handle loading states
- Format numbers for display

**Success Criteria:**
- Metrics display accurately
- Charts render correctly
- Date filtering works
- Performance is acceptable

---

### **Task 13: Create Analytics API Endpoint**
**Dependencies:** Task 5

**Technical Specifications:**
- **File Path:** `src/app/api/analytics/dashboard/route.ts`
- **Dependencies:** `@/lib/database/queries`, `@/lib/auth/server`, `@/lib/monitoring/cost-tracker`
- **API Interface:**
```typescript
interface AnalyticsQuery {
  from?: string; // ISO date
  to?: string;   // ISO date
}

interface DashboardAnalytics {
  executions: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  costs: {
    totalUsd: number;
    avgPerExecution: number;
    byModel: Record<string, number>;
  };
  usage: {
    totalTokens: number;
    avgTokensPerExecution: number;
    topPrompts: { name: string; count: number; }[];
  };
}
```

**Integration Points:**
- Use existing authentication patterns
- Use cost tracking from Task 5
- Follow existing API response formats
- Use existing database queries

**Database Changes:** None

**API Specifications:**
- **Method:** GET
- **Path:** `/api/analytics/dashboard`
- **Query Params:** from, to (optional date range)
- **Auth:** Required
- **Response:** 200 (success), 401 (auth), 500 (error)

**Validation Logic:**
- Validate date range parameters
- Validate user authentication
- Handle empty data gracefully
- Validate date ranges are reasonable

**Success Criteria:**
- API returns accurate analytics data
- Date filtering works correctly
- Performance is acceptable
- Authentication is enforced

---

### **Task 14: Create Custom Hook for Executions**
**Dependencies:** Task 8

**Technical Specifications:**
- **File Path:** `src/hooks/use-executions.ts`
- **Dependencies:** `react`, `@/lib/api`, existing API patterns
- **Hook Interface:**
```typescript
interface UseExecutionsOptions {
  promptId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseExecutionsReturn {
  executions: Execution[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  executePrompt: (promptId: string, inputs: Record<string, any>) => Promise<ExecutionResult>;
  retryExecution: (executionId: string) => Promise<void>;
}
```

**Integration Points:**
- Follow existing hook patterns in `src/hooks/`
- Use existing API client patterns
- Use existing error handling
- Integrate with React Query or SWR if available

**Database Changes:** None

**API Specifications:** Uses existing execution APIs

**Validation Logic:**
- Handle loading states
- Handle error states  
- Handle empty states
- Debounce API calls appropriately

**Success Criteria:**
- Hook provides reliable data
- Loading states work correctly
- Error handling is robust
- Re-fetching works properly

---

## **Phase 3: Polish & Integration (Tasks 15-18)**

### **Task 15: Add Environment Variables and Configuration**
**Dependencies:** Task 1

**Technical Specifications:**
- **File Path:** `.env.example` (update existing)
- **Additional Files:** `src/lib/config/openai.ts`
- **Configuration:**
```typescript
// Add to existing .env.example
OPENAI_API_KEY=sk-your-key-here
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# Cost tracking
GPT35_COST_PER_1K_INPUT=0.0015
GPT35_COST_PER_1K_OUTPUT=0.002
GPT4_COST_PER_1K_INPUT=0.03
GPT4_COST_PER_1K_OUTPUT=0.06

interface OpenAIEnvironment {
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  costConfig: Record<string, { input: number; output: number }>;
}
```

**Integration Points:**
- Update existing environment validation
- Connect to OpenAI client from Task 1
- Integrate with existing config patterns

**Database Changes:** None

**Validation Logic:**
- Validate all required environment variables
- Validate API key format
- Validate numeric values are within bounds
- Provide helpful error messages for missing config

**Success Criteria:**
- Environment variables are documented
- Configuration validation works
- Default values are reasonable
- Error messages are helpful

---

### **Task 16: Integrate Execution Flow with Existing Prompts**
**Dependencies:** Tasks 9, 10, existing prompts functionality

**Technical Specifications:**
- **File Path:** `src/app/(dashboard)/prompts/[id]/page.tsx` (update existing)
- **Dependencies:** Existing prompt page, new execution components
- **Integration Changes:**
```typescript
// Add to existing prompt detail page
import ExecutionPanel from '@/components/execution/execution-panel';
import ExecutionHistory from '@/components/execution/execution-history';

// Add execution tab to existing prompt tabs
interface PromptTabs {
  details: boolean;
  executions: boolean; // New tab
  history: boolean;    // New tab
  settings: boolean;
}
```

**Integration Points:**
- Extend existing prompt detail page
- Use existing tab component patterns
- Integrate with existing prompt loading
- Connect to existing auth context

**Database Changes:** None

**API Specifications:** Uses existing prompt and execution APIs

**Validation Logic:**
- Validate prompt exists
- Validate user owns prompt
- Handle loading states for executions
- Handle empty execution history

**Success Criteria:**
- Execution panel integrates seamlessly
- Tab navigation works correctly
- Data loading is coordinated
- User experience is smooth

---

### **Task 17: Add Basic Error Handling and Retry Logic**
**Dependencies:** Tasks 4, 8

**Technical Specifications:**
- **File Path:** `src/lib/execution/error-handler.ts`
- **Dependencies:** `@/lib/monitoring/logger`, existing error patterns
- **Error Handler:**
```typescript
interface ExecutionError {
  type: 'RATE_LIMIT' | 'API_ERROR' | 'TIMEOUT' | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

class ExecutionErrorHandler {
  handleError(error: any): ExecutionError
  shouldRetry(error: ExecutionError, attemptCount: number): boolean
  getRetryDelay(attemptCount: number): number
  logError(executionId: string, error: ExecutionError): void
}
```

**Integration Points:**
- Integrate with execution API from Task 4
- Use existing logger patterns
- Connect to retry functionality from Task 8
- Follow existing error response formats

**Database Changes:**
```sql
-- Add error tracking to executions table
ALTER TABLE executions ADD COLUMN error_type varchar(50);
ALTER TABLE executions ADD COLUMN error_message text;
ALTER TABLE executions ADD COLUMN retry_count integer DEFAULT 0;
```

**API Specifications:** Enhances existing execution API

**Validation Logic:**
- Classify different types of errors
- Determine retry eligibility
- Calculate appropriate retry delays
- Log errors for monitoring

**Success Criteria:**
- Errors are classified correctly
- Retry logic works appropriately
- Error logging is comprehensive
- User experience handles errors gracefully

---

### **Task 18: Create Sample Demo Data and Seed Script**
**Dependencies:** Tasks 2, 7

**Technical Specifications:**
- **File Path:** `prisma/seed.ts` (update existing)
- **Dependencies:** Existing seed script, template engine, validation system
- **Demo Data:**
```typescript
const demoPrompts = [
  {
    name: "Code Review Assistant",
    description: "Reviews code for best practices and security",
    template: "Review this {{language}} code:\n```{{language}}\n{{code}}\n```\nFocus on: {{focus_areas}}",
    variables: [
      { name: "language", type: "string", required: true, defaultValue: "typescript" },
      { name: "code", type: "string", required: true },
      { name: "focus_areas", type: "string", defaultValue: "security, performance" }
    ],
    validationRules: [
      {
        name: "Code Review Format",
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            issues: { type: "array" },
            recommendations: { type: "array" }
          }
        }
      }
    ]
  }
  // Additional demo prompts...
];
```

**Integration Points:**
- Extend existing seed script
- Use template engine for validation
- Create realistic sample data
- Connect to existing user creation

**Database Changes:** None (adds data to existing tables)

**API Specifications:** None (seed script only)

**Validation Logic:**
- Validate demo data matches schema
- Ensure templates are valid
- Verify validation rules work
- Check sample executions work

**Success Criteria:**
- Demo data creates successfully
- Prompts are immediately usable
- Validation rules work on sample data
- Demo provides good user experience

---

## Implementation Timeline

### Phase 1: Core AI Engine (Week 1)
- **Days 1-2:** Tasks 1-3 (OpenAI integration, template engine, database schema)
- **Days 3-4:** Tasks 4-5 (execution API, cost tracking)  
- **Days 5-7:** Tasks 6-8 (queries, validation, results API)

### Phase 2: User Interface (Week 2)  
- **Days 8-9:** Tasks 9-10 (execution panel, history component)
- **Days 10-11:** Tasks 11-12 (results viewer, analytics dashboard)
- **Days 12-14:** Tasks 13-14 (analytics API, custom hooks)

### Phase 3: Polish & Integration (Week 3)
- **Days 15-16:** Tasks 15-16 (configuration, integration)
- **Days 17-18:** Task 17 (error handling and retry logic)
- **Days 19-21:** Task 18 (demo data and final testing)

## Success Metrics

Each task includes specific success criteria to ensure proper implementation and integration. The overall success will be measured by:

1. **Functional Success:** All AI features work as designed
2. **Integration Success:** Components integrate seamlessly with existing code
3. **User Experience:** Interface is intuitive and responsive
4. **Code Quality:** Implementation follows existing patterns and standards
5. **Portfolio Readiness:** Demonstrates full-stack AI development capabilities

This task plan provides the specific, implementable details needed for reliable AI code generation while maintaining integration awareness with the existing FormaOps codebase.