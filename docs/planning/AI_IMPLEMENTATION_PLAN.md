# AI Features Implementation Plan

## Executive Summary

This document outlines the pragmatic implementation approach for FormaOps' core AI functionality. The goal is to build a working AI prompt management platform with essential features, avoiding both over-engineering (complex edge functions, microservices) and under-engineering (basic chat interface).

**Implementation Philosophy**: Ship a functional MVP with core AI features, then iterate based on usage.

---

## Core AI Features Scope

### 1. Essential Features (Must Have)
- ✅ OpenAI API integration for prompt execution
- ✅ Template variable injection system  
- ✅ Basic execution tracking and results storage
- ✅ Simple validation (JSON schema)
- ✅ Cost tracking (token usage)

### 2. Nice-to-Have Features (Should Have)
- ⚠️ Real-time execution status updates
- ⚠️ Retry logic for failed executions
- ⚠️ Basic analytics dashboard
- ⚠️ Execution history with search

### 3. Advanced Features (Could Have)
- ❌ Complex priority management system
- ❌ Edge functions for AI execution
- ❌ WebSocket real-time updates
- ❌ Advanced validation (regex, custom functions)
- ❌ Multi-model support (beyond OpenAI)

---

## Implementation Strategy

### Phase 1: Core AI Engine (Week 1)
**Goal**: Make prompts actually execute with AI and return results

#### 1.1 OpenAI Integration
```typescript
// /src/lib/openai/client.ts
interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens: number;
  temperature: number;
}

class OpenAIClient {
  async executePrompt(prompt: string, config?: Partial<OpenAIConfig>): Promise<ExecutionResult>
  async calculateCost(tokens: TokenUsage): Promise<number>
}
```

**Implementation Approach**:
- Use official OpenAI SDK (already in package.json)
- Simple async/await pattern, no complex queue management
- Basic error handling with try/catch
- Store API key in environment variables

#### 1.2 Template Engine
```typescript
// /src/lib/prompts/template-engine.ts
interface TemplateVariable {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean';
}

class TemplateEngine {
  injectVariables(template: string, variables: TemplateVariable[]): string
  validateTemplate(template: string): ValidationResult
}
```

**Implementation Approach**:
- Simple string replacement using handlebars-style {{variable}} syntax
- Basic type checking for variables
- No complex conditionals or loops initially

#### 1.3 Execution API
```typescript
// /src/app/api/prompts/[id]/execute/route.ts
interface ExecuteRequest {
  inputs: Record<string, any>;
  model?: 'gpt-3.5-turbo' | 'gpt-4';
}

interface ExecuteResponse {
  executionId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  output?: string;
  tokenUsage?: TokenUsage;
  costUsd?: number;
}
```

**Implementation Approach**:
- Next.js API routes (no edge functions)
- Synchronous execution (no background jobs)
- Store results in database immediately
- Simple error responses with HTTP status codes

### Phase 2: User Experience (Week 2)
**Goal**: Make the AI features usable and visible to users

#### 2.1 Execution Interface
```typescript
// /src/components/execution/execution-panel.tsx
interface ExecutionPanelProps {
  prompt: Prompt;
  onExecute: (inputs: Record<string, any>) => void;
  onResults: (result: ExecutionResult) => void;
}
```

**Features**:
- Variable input form with type validation
- Execute button that calls API
- Results display with formatting
- Basic loading states

#### 2.2 Results History
```typescript
// /src/components/execution/execution-history.tsx
interface ExecutionHistoryProps {
  promptId: string;
  executions: Execution[];
}
```

**Features**:
- Table of past executions with timestamps
- Click to view full results
- Basic status indicators (success/failed)
- Pagination for large lists

#### 2.3 Cost Dashboard
```typescript
// /src/components/analytics/simple-dashboard.tsx
interface DashboardMetrics {
  totalExecutions: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  successRate: number;
}
```

**Features**:
- Simple metric cards showing usage
- Basic charts (line chart for executions over time)
- Daily/weekly/monthly views
- No complex real-time updates

### Phase 3: Quality & Polish (Week 3)
**Goal**: Add validation and improve reliability

#### 3.1 Basic Validation System
```typescript
// /src/lib/validation/schema-validator.ts
interface ValidationRule {
  type: 'json_schema';
  schema: object;
  name: string;
}

class SchemaValidator {
  validate(output: string, rules: ValidationRule[]): ValidationResult
}
```

**Implementation Approach**:
- JSON Schema validation using Zod (already in package.json)
- Simple pass/fail validation
- Store validation results with execution
- No complex retry logic initially

#### 3.2 Error Handling & Retry
```typescript
// /src/lib/execution/error-handler.ts
class ExecutionErrorHandler {
  handleOpenAIError(error: OpenAIError): ExecutionResult
  shouldRetry(error: OpenAIError): boolean
  retryExecution(executionId: string): Promise<ExecutionResult>
}
```

**Implementation Approach**:
- Basic retry for rate limits and timeouts
- Exponential backoff (simple implementation)
- No complex circuit breakers
- User-initiated retries from UI

---

## Technical Decisions & Justifications

### 1. No Edge Functions Initially
**Why**: Edge functions add deployment complexity without significant benefit for portfolio scope
**Instead**: Use Next.js API routes with simple async execution
**Future**: Can migrate to edge functions if needed for scale

### 2. Synchronous Execution
**Why**: Simpler to implement and debug, adequate for demo purposes
**Instead**: Direct OpenAI API calls in request handler
**Future**: Add background jobs if execution times become problematic

### 3. Basic Template Engine
**Why**: Handlebars-style syntax is familiar and sufficient for most use cases
**Instead**: Simple string replacement with {{variable}} syntax
**Future**: Add conditionals and loops if needed

### 4. Simple Validation
**Why**: JSON Schema covers 80% of validation needs for AI outputs
**Instead**: Focus on schema validation with Zod integration
**Future**: Add regex and custom function validation later

### 5. No Real-time Updates Initially
**Why**: WebSocket complexity isn't justified for portfolio project
**Instead**: Polling or refresh-based updates
**Future**: Add WebSocket support for better UX

---

## Database Changes Required

### New Tables Needed
```sql
-- execution_results table for storing AI outputs
CREATE TABLE execution_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES executions(id) ON DELETE CASCADE,
  raw_output text NOT NULL,
  tokens_used jsonb,
  cost_usd decimal(10,6),
  validation_status varchar(20) DEFAULT 'pending',
  validation_errors jsonb,
  created_at timestamp DEFAULT now()
);

-- validation_rules table for prompt validation
CREATE TABLE validation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid REFERENCES prompts(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  type varchar(20) NOT NULL, -- 'json_schema', 'regex', 'function'
  config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
```

### Existing Table Updates
```sql
-- Add columns to executions table
ALTER TABLE executions ADD COLUMN model varchar(50) DEFAULT 'gpt-3.5-turbo';
ALTER TABLE executions ADD COLUMN total_tokens integer;
ALTER TABLE executions ADD COLUMN cost_usd decimal(10,6);

-- Add indexes for performance
CREATE INDEX idx_executions_prompt_created ON executions(prompt_id, created_at);
CREATE INDEX idx_executions_user_created ON executions(user_id, created_at);
```

---

## Environment Variables Required

```bash
# OpenAI Integration
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# Cost Tracking
GPT35_COST_PER_1K_INPUT=0.0015
GPT35_COST_PER_1K_OUTPUT=0.002
GPT4_COST_PER_1K_INPUT=0.03
GPT4_COST_PER_1K_OUTPUT=0.06

# Rate Limiting
MAX_EXECUTIONS_PER_HOUR=100
MAX_TOKENS_PER_DAY=50000
```

---

## Success Metrics

### Functional Success
- [ ] Users can create prompts with variables
- [ ] Prompts execute successfully with OpenAI
- [ ] Results are stored and displayed
- [ ] Basic validation works
- [ ] Cost tracking shows accurate numbers

### Technical Success
- [ ] API response time < 10s for most prompts
- [ ] Error handling prevents crashes
- [ ] Database queries are efficient
- [ ] Code is maintainable and testable

### Portfolio Success
- [ ] Demonstrates full-stack AI integration
- [ ] Shows practical understanding of AI APIs
- [ ] Displays good UX design for AI tools
- [ ] Code quality suitable for senior developer role

---

## Implementation Timeline

### Week 1: Core AI Engine
- Day 1-2: OpenAI client integration
- Day 3-4: Template engine and variable injection
- Day 5-7: Execution API endpoints and database integration

### Week 2: User Interface
- Day 8-9: Execution panel and variable input forms
- Day 10-11: Results display and execution history
- Day 12-14: Basic analytics and cost dashboard

### Week 3: Polish & Validation
- Day 15-16: Schema validation system
- Day 17-18: Error handling and retry logic
- Day 19-21: Testing, bug fixes, and demo data

**Total Effort**: 3 weeks for functional AI prompt management platform

---

## Risk Mitigation

### Technical Risks
1. **OpenAI API Rate Limits**: Implement simple rate limiting and user feedback
2. **Execution Timeouts**: Set reasonable timeout values and show progress
3. **Database Performance**: Add proper indexes and query optimization
4. **Error Handling**: Comprehensive try/catch with user-friendly messages

### Scope Risks
1. **Feature Creep**: Stick to essential features only
2. **Over-engineering**: Use simplest solution that works
3. **Under-delivery**: Focus on working features over perfect features
4. **Time Pressure**: Cut nice-to-have features before cutting quality

This plan balances functionality with simplicity, ensuring we deliver a working AI prompt management platform that demonstrates technical competence without unnecessary complexity.