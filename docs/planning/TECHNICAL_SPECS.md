# FormaOps Technical Specifications

## API Design

### Core Endpoints

**Authentication**

```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

**Prompts**

```
GET    /api/prompts              # List user prompts
POST   /api/prompts              # Create prompt
GET    /api/prompts/:id          # Get prompt details
PUT    /api/prompts/:id          # Update prompt
DELETE /api/prompts/:id          # Delete prompt
GET    /api/prompts/:id/versions # Version history
```

**Executions**

```
POST   /api/prompts/:id/execute  # Execute prompt
GET    /api/executions           # List executions
GET    /api/executions/:id       # Execution details
POST   /api/executions/:id/retry # Retry failed execution
```

**System**

```
GET    /api/health               # System health
GET    /api/metrics              # Performance metrics
```

### Request/Response Schemas

**Prompt Creation**

```typescript
// POST /api/prompts
interface CreatePromptRequest {
  name: string;
  description?: string;
  template: string;
  variables: VariableDefinition[];
  validations?: ValidationRule[];
}

interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description?: string;
  defaultValue?: any;
}
```

**Execution Request**

```typescript
// POST /api/prompts/:id/execute
interface ExecutePromptRequest {
  inputs: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  validateOutput?: boolean;
}

interface ExecutionResponse {
  id: string;
  status: ExecutionStatus;
  output?: string;
  validatedOutput?: any;
  metrics: {
    latencyMs: number;
    tokenUsage: TokenUsage;
    costUsd: number;
  };
}
```

## Database Schema (Key Tables)

### Core Models

```prisma
model Prompt {
  id          String   @id @default(uuid())
  name        String
  template    String
  variables   Json
  status      PromptStatus
  userId      String
  createdAt   DateTime @default(now())

  executions  Execution[]

  @@index([userId, status])
}

model Execution {
  id              String @id @default(uuid())
  inputs          Json
  output          String?
  status          ExecutionStatus
  latencyMs       Int?
  tokenUsage      Json?
  costUsd         Decimal?

  promptId        String
  userId          String
  createdAt       DateTime @default(now())

  @@index([userId, createdAt])
  @@index([promptId, createdAt])
}
```

## Technology Stack Justification

**Frontend: Next.js 15 + TypeScript**

- App Router for better performance and developer experience
- Built-in API routes eliminate need for separate backend
- Excellent TypeScript support and type inference
- Vercel deployment optimization

**Database: PostgreSQL + Prisma**

- ACID compliance for execution integrity
- Rich query capabilities for analytics
- Prisma provides type-safe database access
- Easy migrations and schema evolution

**Authentication: Supabase Auth**

- Production-ready with minimal setup
- Built-in RLS for data security
- Social logins and email verification
- Scales without custom user management

**AI Integration: OpenAI API**

- Industry-standard reliability
- Comprehensive model selection
- Well-documented with TypeScript support
- Cost-effective for portfolio scope

**Deployment: Vercel + Supabase**

- Zero-config deployments
- Automatic HTTPS and global CDN
- Environment variable management
- Free tier suitable for portfolio projects

## System Design Overview

```
[User] → [Next.js App] → [API Routes] → [Prisma] → [PostgreSQL]
            ↓
    [Supabase Auth] ← → [OpenAI API]
            ↓
    [Edge Functions] → [Real-time Updates]
```

**Data Flow:**

1. User creates prompt template with variables
2. Execution request validates inputs and queues job
3. Edge function processes prompt with OpenAI
4. Results stored with metrics and validation status
5. Real-time updates sent to frontend via WebSockets

**Key Design Decisions:**

- Edge functions for AI processing (better performance)
- Database-first approach (audit trail and analytics)
- Type-safe APIs (prevents runtime errors)
- Modular validation system (extensible)

## Performance Requirements

**Response Times:**

- Page loads: < 2s
- API responses: < 500ms
- AI executions: < 10s (depends on OpenAI)

**Scalability:**

- Support 100+ concurrent users
- Handle 1000+ prompts per user
- Process 10+ executions per minute

**Reliability:**

- 99% uptime target
- Graceful error handling
- Automatic retries for transient failures

This specification provides clear technical direction while remaining achievable for a portfolio project scope.
