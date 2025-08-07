# FormaOps Architecture Plan

## Executive Summary

FormaOps is an AI-native developer platform for creating, testing, validating, and executing reusable operational prompts. The system treats prompts as infrastructure with the AI agent receiving CPU priority above all other operations.

## Core Architecture Principles

1. **AI-First Priority**: Agent operations always receive CPU priority over UI/analytics
2. **Edge-Native Execution**: All prompt execution via isolated edge functions
3. **Infrastructure-as-Code**: Prompts are treated as versioned, testable infrastructure
4. **Fault Tolerance**: Resumable, idempotent operations with comprehensive logging
5. **Developer Experience**: Built for developers building *with* AI, not chatting with it

---

## 1. Project Structure & Module Organization

```
/formaOps
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── functions/
│       ├── agent-executor/
│       ├── prompt-runner/
│       ├── validation-engine/
│       └── priority-manager/
├── src/
│   ├── app/                          # Next.js 15 App Router
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── prompts/
│   │   │   ├── executions/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── prompts/
│   │       ├── executions/
│   │       ├── health/
│   │       └── webhooks/
│   ├── lib/                          # Core business logic
│   │   ├── auth/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── database/
│   │   │   ├── client.ts
│   │   │   ├── queries/
│   │   │   └── types.ts
│   │   ├── agent/                    # AI Agent Core
│   │   │   ├── executor.ts
│   │   │   ├── priority-manager.ts
│   │   │   ├── context-builder.ts
│   │   │   └── types.ts
│   │   ├── prompts/                  # Prompt Management
│   │   │   ├── template-engine.ts
│   │   │   ├── variable-injector.ts
│   │   │   ├── versioning.ts
│   │   │   └── types.ts
│   │   ├── validation/               # Output Validation
│   │   │   ├── schema-validator.ts
│   │   │   ├── regex-validator.ts
│   │   │   ├── test-runner.ts
│   │   │   └── types.ts
│   │   ├── execution/                # Execution Engine
│   │   │   ├── edge-dispatcher.ts
│   │   │   ├── result-handler.ts
│   │   │   ├── retry-logic.ts
│   │   │   └── types.ts
│   │   ├── monitoring/               # Logging & Analytics
│   │   │   ├── logger.ts
│   │   │   ├── cost-tracker.ts
│   │   │   ├── performance-monitor.ts
│   │   │   └── audit-trail.ts
│   │   └── utils/
│   │       ├── constants.ts
│   │       ├── helpers.ts
│   │       └── types.ts
│   ├── components/                   # React Components
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── prompts/
│   │   │   ├── prompt-editor.tsx
│   │   │   ├── prompt-list.tsx
│   │   │   ├── variable-manager.tsx
│   │   │   └── version-history.tsx
│   │   ├── execution/
│   │   │   ├── run-panel.tsx
│   │   │   ├── results-viewer.tsx
│   │   │   ├── real-time-status.tsx
│   │   │   └── execution-history.tsx
│   │   ├── validation/
│   │   │   ├── schema-editor.tsx
│   │   │   ├── test-runner.tsx
│   │   │   └── validation-results.tsx
│   │   └── analytics/
│   │       ├── cost-dashboard.tsx
│   │       ├── performance-charts.tsx
│   │       └── usage-metrics.tsx
│   ├── hooks/                        # React Hooks
│   │   ├── use-prompts.ts
│   │   ├── use-executions.ts
│   │   ├── use-real-time.ts
│   │   └── use-analytics.ts
│   └── types/                        # Global TypeScript types
│       ├── auth.ts
│       ├── database.ts
│       ├── api.ts
│       └── global.ts
├── tests/
│   ├── __mocks__/
│   ├── integration/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── api/
│   ├── deployment/
│   └── development/
└── .github/
    └── workflows/
        ├── ci.yml
        ├── cd.yml
        └── security.yml
```

---

## 2. Core Features & Organization

### 2.1 Prompt Management (`/src/lib/prompts/`)
- **Template Engine**: Handlebars-style variable substitution
- **Variable Injection**: Type-safe input validation and insertion
- **Versioning**: Git-like versioning with rollback capabilities
- **Import/Export**: JSON/YAML format support

### 2.2 AI Agent Core (`/src/lib/agent/`)
- **Executor**: Main agent orchestration with OpenAI API integration
- **Priority Manager**: CPU priority enforcement and resource allocation
- **Context Builder**: Dynamic context assembly from templates and variables

### 2.3 Execution Engine (`/src/lib/execution/`)
- **Edge Dispatcher**: Routes executions to Supabase/Vercel edge functions
- **Result Handler**: Processes and stores execution results
- **Retry Logic**: Exponential backoff with circuit breaker pattern

### 2.4 Validation System (`/src/lib/validation/`)
- **Schema Validator**: JSON Schema validation (Zod integration)
- **Regex Validator**: Pattern matching for text outputs
- **Test Runner**: Custom JavaScript test functions

### 2.5 Monitoring & Analytics (`/src/lib/monitoring/`)
- **Cost Tracker**: Token usage and API cost calculation
- **Performance Monitor**: Latency, throughput, and error metrics
- **Audit Trail**: Complete execution history and compliance logging

---

## 3. Database Schema Design (Prisma + Supabase)

### 3.1 Prisma Schema Structure

```prisma
// Users & Authentication (extends Supabase auth.users)
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  name            String?
  avatarUrl       String?
  plan            UserPlan  @default(FREE)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  prompts         Prompt[]
  executions      Execution[]
  apiKeys         ApiKey[]
  
  @@map("users")
}

// Prompt Templates
model Prompt {
  id              String          @id @default(uuid())
  name            String
  description     String?
  template        String          // The actual prompt template
  variables       Json            // Variable definitions with types
  version         Int             @default(1)
  status          PromptStatus    @default(DRAFT)
  tags            String[]        @default([])
  
  // Metadata
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  publishedAt     DateTime?
  
  // Relations
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  executions      Execution[]
  validations     Validation[]
  versions        PromptVersion[]
  
  @@map("prompts")
  @@index([userId, status])
  @@index([createdAt])
}

// Prompt Versioning
model PromptVersion {
  id              String    @id @default(uuid())
  version         Int
  template        String
  variables       Json
  changeLog       String?
  createdAt       DateTime  @default(now())
  
  // Relations
  promptId        String
  prompt          Prompt    @relation(fields: [promptId], references: [id], onDelete: Cascade)
  
  @@map("prompt_versions")
  @@unique([promptId, version])
}

// Execution Records
model Execution {
  id              String          @id @default(uuid())
  
  // Input Data
  inputs          Json            // Variable values used
  context         Json?           // Additional context data
  
  // Execution Details
  status          ExecutionStatus @default(PENDING)
  priority        Priority        @default(NORMAL)
  edgeFunctionId  String?         // Edge function execution ID
  
  // Results
  output          String?         // Raw AI response
  validatedOutput Json?           // Post-validation structured data
  validationStatus ValidationStatus @default(PENDING)
  
  // Metrics
  tokenUsage      Json?           // Input/output token counts
  latencyMs       Int?
  costUsd         Decimal?        @db.Decimal(10,6)
  
  // Timestamps
  createdAt       DateTime        @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  
  // Relations
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  promptId        String
  prompt          Prompt          @relation(fields: [promptId], references: [id])
  logs            ExecutionLog[]
  
  @@map("executions")
  @@index([userId, status])
  @@index([createdAt])
  @@index([promptId, createdAt])
}

// Validation Rules
model Validation {
  id              String          @id @default(uuid())
  name            String
  type            ValidationType  // SCHEMA, REGEX, FUNCTION
  config          Json            // Validation configuration
  isActive        Boolean         @default(true)
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  // Relations
  promptId        String
  prompt          Prompt          @relation(fields: [promptId], references: [id], onDelete: Cascade)
  
  @@map("validations")
}

// Execution Logging
model ExecutionLog {
  id              String      @id @default(uuid())
  level           LogLevel    @default(INFO)
  message         String
  metadata        Json?
  timestamp       DateTime    @default(now())
  
  // Relations
  executionId     String
  execution       Execution   @relation(fields: [executionId], references: [id], onDelete: Cascade)
  
  @@map("execution_logs")
  @@index([executionId, timestamp])
}

// API Key Management
model ApiKey {
  id              String      @id @default(uuid())
  name            String
  keyHash         String      @unique  // Hashed API key
  lastUsed        DateTime?
  isActive        Boolean     @default(true)
  createdAt       DateTime    @default(now())
  
  // Relations
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("api_keys")
}

// Enums
enum UserPlan {
  FREE
  PRO
  ENTERPRISE
}

enum PromptStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum ExecutionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum ValidationStatus {
  PENDING
  PASSED
  FAILED
  SKIPPED
}

enum Priority {
  LOW
  NORMAL
  HIGH
  CRITICAL
}

enum ValidationType {
  SCHEMA
  REGEX
  FUNCTION
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}
```

### 3.2 Supabase RLS Policies

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own prompts" ON prompts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own prompts" ON prompts
  FOR ALL USING (auth.uid()::text = user_id);

-- Similar policies for executions, validations, etc.
CREATE POLICY "Users can view own executions" ON executions
  FOR SELECT USING (auth.uid()::text = user_id);

-- Real-time subscriptions for execution status
CREATE POLICY "Users can subscribe to own execution updates" ON executions
  FOR SELECT USING (auth.uid()::text = user_id);
```

---

## 4. AI Agent Execution Strategy

### 4.1 CPU Priority System

**Priority Manager** (`/src/lib/agent/priority-manager.ts`):
```typescript
interface PriorityConfig {
  maxConcurrentAgentOps: number;    // Configurable: AGENT_MAX_CONCURRENT || 5
  agentCpuReservation: number;      // Configurable: AGENT_CPU_RESERVE || 70
  uiOperationThreshold: number;     // Configurable: UI_THRESHOLD || 2
  autoScaleThreshold: number;       // Configurable: SCALE_THRESHOLD || 80
}

interface CircuitBreakerConfig {
  failureThreshold: number;         // Configurable: FAILURE_THRESHOLD || 5
  timeoutMs: number;               // Configurable: TIMEOUT_MS || 30000
  recoveryTimeMs: number;          // Configurable: RECOVERY_TIME || 60000
  fallbackStrategy: 'queue' | 'reject' | 'degrade'; // FALLBACK_STRATEGY || 'queue'
}

interface DegradationStrategy {
  highLoadThreshold: number;       // 70% capacity
  criticalLoadThreshold: number;   // 90% capacity
  actions: {
    highLoad: 'defer_analytics' | 'reduce_logging';
    criticalLoad: 'essential_only' | 'reject_non_priority';
  };
}
```

**Enforcement Mechanisms**:
1. **Queue Management**: Agent operations bypass normal request queues with circuit breaker protection
2. **Resource Allocation**: Configurable CPU reservation (default 70%) with dynamic adjustment
3. **UI Deferral**: Non-critical UI operations pause when agent load exceeds threshold
4. **Edge Function Scaling**: Auto-scale edge functions with fallback to queue mode on failures
5. **Graceful Degradation**: Automatic reduction of non-essential services under high load

### 4.2 Edge Function Architecture

**Supabase Edge Functions** (`/supabase/functions/`):

1. **agent-executor**: Primary AI execution runtime
   - OpenAI API integration
   - Context assembly and prompt processing
   - Result streaming and storage

2. **prompt-runner**: Orchestrates prompt execution pipeline
   - Input validation and variable injection
   - Calls agent-executor with priority handling
   - Manages execution state and retries

3. **validation-engine**: Post-execution validation
   - Schema validation (JSON Schema/Zod)
   - Regex pattern matching
   - Custom test function execution

4. **priority-manager**: Resource allocation and queue management
   - Monitors system load and capacity with health checks
   - Enforces priority policies with graceful degradation
   - Triggers auto-scaling events and manages fallback strategies
   - Implements circuit breaker patterns for service protection

### 4.3 Fault Tolerance & Resumability

**Design Patterns**:
- **Idempotent Operations**: All executions use UUID-based idempotency keys
- **State Checkpointing**: Execution state saved at each major step
- **Circuit Breaker**: Automatic fallback for failed edge functions with configurable thresholds
- **Retry Logic**: Exponential backoff with jitter (max retries: RETRY_LIMIT || 3)
- **Timeout Handling**: Configurable timeouts per operation type (EXEC_TIMEOUT || 30s)
- **Error Classification**: Retryable vs non-retryable errors with appropriate handling

---

## 5. Output Validation System

### 5.1 Validation Types

1. **Schema Validation** (`/src/lib/validation/schema-validator.ts`):
   - JSON Schema support via Zod
   - TypeScript type generation
   - Nested object validation
   - Array and union type support

2. **Regex Validation** (`/src/lib/validation/regex-validator.ts`):
   - Pattern matching for text outputs
   - Named capture groups
   - Multi-line and case-insensitive options

3. **Function Validation** (`/src/lib/validation/test-runner.ts`):
   - Custom JavaScript test functions
   - Sandboxed execution environment
   - Access to execution context and metadata

### 5.2 Validation Pipeline

```typescript
interface ValidationPipeline {
  preValidation: ValidationRule[];   // Before AI execution
  postValidation: ValidationRule[]; // After AI execution
  onFailure: ValidationAction[];    // Retry, alert, or fail
}
```

**Execution Flow**:
1. Pre-validation: Input and template validation
2. AI Execution: Prompt processing with agent
3. Post-validation: Output validation against rules
4. Result Storage: Validated output stored with metadata

---

## 6. Logging, Audit & Cost Tracking

### 6.1 Comprehensive Logging

**Log Categories**:
- **Execution Logs**: Step-by-step execution traces
- **Performance Logs**: Latency, throughput, and resource usage
- **Error Logs**: Failures, retries, and system errors
- **Audit Logs**: User actions, API access, and data changes

**Storage Strategy**:
- Hot data: PostgreSQL (last 30 days) with daily automated backups
- Warm data: Supabase Storage (30-365 days) with point-in-time recovery
- Cold data: Archive to S3 (>365 days) with lifecycle policies
- Backup retention: 30 days hot, 90 days warm, 7 years cold

**Data Safety & Recovery**:
- **Automated Backups**: Daily PostgreSQL dumps via Supabase (built-in)
- **Point-in-Time Recovery**: 7-day window for critical data restoration
- **Cross-Region Replication**: Async replication to secondary region
- **Data Integrity**: Checksum validation on critical operations
- **Disaster Recovery**: RTO: 4 hours, RPO: 1 hour for production data

### 6.2 Cost Tracking

**Cost Components**:
- OpenAI API usage (input/output tokens)
- Edge function execution time
- Database operations and storage
- Real-time subscriptions

**Tracking Implementation**:
```typescript
interface CostMetrics {
  tokenCosts: {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
  };
  infrastructureCosts: {
    edgeFunctionMs: number;
    databaseOps: number;
    storageMb: number;
  };
  dailyBudgets: {
    user: number;
    prompt: number;
    organization: number;
  };
}
```

### 6.3 Analytics Dashboard

**Key Metrics & SLAs**:

*Performance Targets:*
- Execution latency: < 5s p95, < 2s p50
- System availability: 99.5% uptime (43.8min downtime/month)
- Error rate: < 1% for successful validations
- Agent response time: < 500ms for priority operations

*Operational Metrics:*
- Execution success rate and latency percentiles
- Cost per execution and daily/monthly spending
- Token usage trends and optimization opportunities
- Validation failure patterns and error analysis
- Resource utilization and scaling effectiveness

*Alerting Thresholds:*
- Error rate > 2% for 5 minutes
- Latency p95 > 10s for 3 minutes  
- System availability < 99% for 10 minutes
- Cost anomalies > 150% of daily average

---

## 7. Testing, CI/CD & Development Strategy

### 7.1 Testing Approach

**Test Categories**:
1. **Unit Tests**: Jest + Testing Library for components and utilities
2. **Integration Tests**: API route testing with test database
3. **E2E Tests**: Playwright for full user workflows
4. **Agent Tests**: Mock OpenAI responses for deterministic testing
5. **Edge Function Tests**: Supabase CLI local testing

**Test Structure**:
```
/tests
├── unit/
│   ├── components/
│   ├── lib/
│   └── utils/
├── integration/
│   ├── api/
│   ├── database/
│   └── edge-functions/
└── e2e/
    ├── prompt-creation.spec.ts
    ├── execution-flow.spec.ts
    └── validation.spec.ts
```

### 7.2 CI/CD Pipeline

**GitHub Actions Workflow**:
1. **Code Quality**: ESLint, Prettier, TypeScript checks
2. **Security**: Dependency scanning, secret detection
3. **Testing**: Unit → Integration → E2E test execution
4. **Build**: Next.js build with optimization
5. **Deploy**: Vercel deployment with Supabase migration
6. **Monitoring**: Post-deployment health checks

**Environment Strategy**:
- Development: Local Supabase + OpenAI dev keys
- Staging: Supabase staging + OpenAI test environment  
- Production: Supabase production + OpenAI production keys

### 7.3 Development Workflow

**Key Development Commands**:
```bash
# Local development
npm run dev          # Next.js dev server
npm run db:migrate   # Prisma migrations
npm run supabase:start # Local Supabase

# Testing
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run test:edge    # Edge function tests

# Configuration
npm run config:check # Validate environment variables
npm run config:gen   # Generate config template

# Deployment
npm run build        # Production build
npm run deploy       # Deploy to Vercel
```

**Environment Configuration**:
```bash
# Core Settings
AGENT_CPU_RESERVE=70        # CPU reservation percentage
AGENT_MAX_CONCURRENT=5      # Max concurrent agent operations
UI_THRESHOLD=2              # UI deferral threshold

# Resilience Settings
FAILURE_THRESHOLD=5         # Circuit breaker failure limit
TIMEOUT_MS=30000           # Operation timeout
RETRY_LIMIT=3              # Maximum retry attempts

# Performance Settings
SCALE_THRESHOLD=80          # Auto-scale trigger percentage
FALLBACK_STRATEGY=queue     # Failure handling strategy
```

**Code Standards**:
- TypeScript strict mode enforcement
- ESLint + Prettier configuration
- Conventional commit messages
- PR-based workflow with automated checks

---

## 8. Security & Performance Considerations

### 8.1 Security Measures

- **Authentication**: Supabase Auth with RLS policies and MFA support
- **API Security**: Rate limiting, input validation, CORS policies, API key rotation
- **Data Encryption**: At-rest (AES-256) and in-transit (TLS 1.3) encryption
- **Secret Management**: Environment variables via Vercel/Supabase with rotation policies
- **Edge Function Security**: Isolated execution environments with resource limits
- **Audit Logging**: All data access and modifications logged with retention policies
- **Backup Security**: Encrypted backups with separate access controls

### 8.2 Performance Optimizations

- **Caching Strategy**: Redis for hot data (TTL: 5min), CDN for static assets (TTL: 24h)
- **Database Indexing**: Optimized queries with proper indexing and query planning
- **Edge Computing**: Global distribution via Supabase edge functions with auto-scaling
- **Real-time Updates**: WebSocket connections for live execution status with connection pooling
- **Bundle Optimization**: Code splitting and lazy loading with performance budgets
- **Resource Management**: Connection pooling, query batching, and result pagination
- **Monitoring Integration**: Real-time performance metrics with automated optimization triggers

---

## 9. Scalability & Future Considerations

### 9.1 Scaling Strategy

**Horizontal Scaling**:
- Edge functions auto-scale based on demand
- Database read replicas for analytics queries  
- CDN distribution for global performance

**Vertical Scaling**:
- CPU priority system adapts to increased load
- Memory optimization for large prompt templates
- Connection pooling for database efficiency

### 9.2 Extension Points

**Plugin Architecture**:
- Custom validation functions
- Third-party AI model integrations
- External data source connectors
- Webhook and API integrations

**Enterprise Features**:
- Multi-tenant organization support with resource isolation
- Advanced RBAC and audit requirements with compliance reporting
- Custom deployment options (on-premise) with air-gapped support
- SLA monitoring and alerting with automated escalation
- Disaster recovery automation with cross-region failover
- Custom integration APIs with webhook reliability patterns

---

## Implementation Priority

**Phase 1: Core Foundation** (Weeks 1-2)
- Basic Next.js setup with auth
- Prisma schema and Supabase configuration  
- Simple prompt creation and execution

**Phase 2: Agent System** (Weeks 3-4)
- Edge function deployment
- AI agent integration with OpenAI
- Priority management system

**Phase 3: Validation & Monitoring** (Weeks 5-6)
- Output validation system
- Logging and cost tracking
- Basic analytics dashboard

**Phase 4: Polish & Production** (Weeks 7-8)
- Testing suite completion
- Performance optimization
- Production deployment and monitoring

## 10. Operational Excellence & Reliability

### 10.1 Service Health Monitoring
- **Health Endpoints**: `/api/health` with dependency checks (database, AI APIs, edge functions)
- **Circuit Breaker Dashboards**: Real-time status of all circuit breakers and fallback modes
- **Capacity Planning**: Automated scaling recommendations based on usage patterns
- **Incident Response**: Automated alerting with escalation paths and runbook integration

### 10.2 Graceful Degradation Framework
```typescript
interface DegradationLevels {
  NORMAL: 'all_features_available';
  DEGRADED: 'non_essential_features_disabled';
  CRITICAL: 'core_execution_only';
  EMERGENCY: 'read_only_mode';
}

interface DegradationTriggers {
  cpu_usage: 85;           // Trigger degradation at 85% CPU
  error_rate: 5;           // 5% error rate threshold
  response_time: 10000;    // 10s response time threshold
  dependency_failures: 3;  // 3 consecutive dependency failures
}
```

### 10.3 Recovery & Continuity
- **Automatic Recovery**: Self-healing capabilities for common failure modes
- **State Reconstruction**: Ability to rebuild system state from audit logs
- **Rollback Procedures**: Automated and manual rollback capabilities for deployments
- **Chaos Engineering**: Regular failure injection testing to validate resilience

---

This architecture provides a robust foundation for building FormaOps as an AI-native developer platform with enterprise-grade reliability, configurable performance characteristics, and operational excellence built into the core system design.