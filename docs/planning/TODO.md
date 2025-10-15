# FormaOps - Architecture TODO

**Status**: Technical Debt Documentation
**Priority**: Medium
**Last Updated**: 2025-10-15

---

## Executive Summary

FormaOps currently exhibits **architectural inconsistency** in its layered architecture implementation. The **execution domain** follows proper service/repository pattern with closed layers, while the **prompt domain** bypasses abstraction layers and directly accesses the database from API routes. This document outlines the issues, impact, and recommended refactoring approach.

---

## Identified Architectural Inconsistencies

### 1. Inconsistent Layer Isolation

#### ✅ Execution Domain (Correct Pattern)

```
Presentation Layer (Components/Hooks)
         ↓
Business Layer (API Routes)
         ↓
Service Layer (ExecutionService)
         ↓
Persistence Layer (ExecutionRepository)
         ↓
Database Layer (Prisma Queries)
```

**Evidence**:

- `src/lib/services/execution-service.ts:54` - Uses repository abstraction
- `src/lib/repositories/execution-repository.ts:42-143` - Transforms database types
- `src/app/api/executions/route.ts:42` - Uses repository, not direct DB access

#### ❌ Prompt Domain (Layer Skipping)

```
Presentation Layer (Components/Hooks)
         ↓
Business Layer (API Routes)
         ↓ [SKIPS SERVICE & REPOSITORY LAYERS]
Database Layer (Direct Prisma Queries)
```

**Evidence**:

- `src/app/api/prompts/route.ts:4` - Direct import: `import { getUserPrompts, createPrompt } from '@/lib/database/queries'`
- No `PromptService` exists
- No `PromptRepository` exists
- Business logic embedded in API routes

### 2. Type Coupling Issues

**Problem**: Frontend hooks directly import database types

```typescript
// src/hooks/use-executions.ts:6
import type { ExecutionWithDetails } from '../lib/database/queries';
```

**Impact**: Frontend tightly coupled to database schema, violating layer isolation principle.

### 3. Open vs Closed Layers

| Layer            | Execution Domain  | Prompt Domain         | Issue            |
| ---------------- | ----------------- | --------------------- | ---------------- |
| Service Layer    | Closed (required) | N/A (doesn't exist)   | Inconsistent     |
| Repository Layer | Closed (required) | N/A (doesn't exist)   | Inconsistent     |
| Database Layer   | Isolated          | Exposed to API routes | Security concern |

---

## Impact Assessment

### Current Consequences

#### 🔴 High Impact

1. **Maintainability**: Developers must learn two different patterns
2. **Code Duplication**: Business logic duplicated across prompt API routes
3. **Testing Complexity**: Cannot mock prompt operations at service level

#### 🟡 Medium Impact

4. **Extensibility**: Adding caching/monitoring to prompts requires touching multiple files
5. **Refactoring Risk**: Changes to prompt schema affect API routes directly
6. **Onboarding Time**: New developers confused by inconsistent patterns

#### 🟢 Low Impact

7. **Performance**: No performance degradation (both patterns work)
8. **Type Safety**: TypeScript strict mode still enforced
9. **Functionality**: Application works correctly despite inconsistency

### Future Risks

1. **Scalability**: Prompt domain harder to scale than execution domain
2. **Technical Debt**: Accumulates faster without proper abstraction
3. **Feature Development**: New prompt features require more changes than execution features

---

## Recommended Architecture: Unified Layered Approach

### Target Architecture

Apply **Closed Layer Architecture** consistently across all domains:

```
┌─────────────────────────────────────────────────────────────┐
│                  CROSS-CUTTING CONCERNS                     │
│  Security │ Monitoring │ Caching │ Resilience               │
└─────────────────────────────────────────────────────────────┘
         ║            ║         ║          ║
         ↓            ↓         ↓          ↓
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                         │
│  - React Components                                         │
│  - Next.js Pages                                            │
│  - Custom Hooks (use-prompts, use-executions)               │
└─────────────────────────────────────────────────────────────┘
                          ↓ (HTTP/API)
┌─────────────────────────────────────────────────────────────┐
│  BUSINESS LAYER (API ROUTES)                                │
│  - src/app/api/prompts/route.ts                             │
│  - src/app/api/executions/route.ts                          │
│  - Request validation (Zod schemas)                         │
│  - Authentication (requireAuth)                             │
│  - Response formatting                                      │
└─────────────────────────────────────────────────────────────┘
                          ↓ (Function calls)
┌─────────────────────────────────────────────────────────────┐
│  SERVICE LAYER (BUSINESS LOGIC)                             │
│  - src/lib/services/execution-service.ts ✅                  │
│  - src/lib/services/prompt-service.ts ❌ (MISSING)          │
│  - Orchestration logic                                      │
│  - Error handling & transformation                          │
│  - Business rule enforcement                                │
└─────────────────────────────────────────────────────────────┘
                          ↓ (Function calls)
┌─────────────────────────────────────────────────────────────┐
│  PERSISTENCE LAYER (DATA ACCESS)                            │
│  - src/lib/repositories/execution-repository.ts ✅           │
│  - src/lib/repositories/prompt-repository.ts ❌ (MISSING)   │
│  - Data transformation (DB types → Domain types)            │
│  - Query composition                                        │
│  - Cache integration                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓ (Prisma calls)
┌─────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                             │
│  - src/lib/database/queries.ts                              │
│  - Pure Prisma queries (no business logic)                  │
│  - Retry logic & circuit breaker                            │
│  - Performance monitoring                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    PostgreSQL (Supabase)
```

---

## Refactoring Plan

### Phase 1: Create Prompt Repository (2 hours)

#### 1.1 Create `src/lib/repositories/prompt-repository.ts`

**Purpose**: Abstract database access for prompts, mirror execution repository pattern

**Key Responsibilities**:

- Transform database types to domain types
- Handle prompt-specific queries
- Integrate caching layer
- Provide consistent error handling

**File Structure**:

```typescript
// src/lib/repositories/prompt-repository.ts

import {
  getUserPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from '../database/queries';
import { PromptServiceError } from '../errors/prompt-errors';

export interface PromptFilters {
  userId: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  search?: string;
  page?: number;
  limit?: number;
}

export interface PromptDomainType {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: VariableDefinition[];
  status: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export class PromptRepository {
  async getPrompts(
    filters: PromptFilters
  ): Promise<{ prompts: PromptDomainType[]; pagination: any }> {
    // Call database queries
    // Transform to domain types
    // Handle errors with PromptServiceError
  }

  async getPromptById(id: string, userId: string): Promise<PromptDomainType> {
    // Fetch prompt
    // Transform
    // Return or throw
  }

  async createPrompt(
    userId: string,
    data: CreatePromptData
  ): Promise<PromptDomainType> {
    // Validate
    // Create
    // Transform
  }

  async updatePrompt(
    id: string,
    userId: string,
    data: UpdatePromptData
  ): Promise<PromptDomainType> {
    // Update
    // Transform
  }

  async deletePrompt(id: string, userId: string): Promise<void> {
    // Delete with ownership check
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    // Database connectivity check
  }
}

export const promptRepository = new PromptRepository();
```

#### 1.2 Create `src/lib/errors/prompt-errors.ts`

```typescript
export class PromptServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public context?: Record<string, any>,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'PromptServiceError';
  }
}
```

### Phase 2: Create Prompt Service (1.5 hours)

#### 2.1 Create `src/lib/services/prompt-service.ts`

**Purpose**: Business logic layer for prompts, orchestration between API and repository

**Key Responsibilities**:

- Input validation (beyond Zod schema validation)
- Business rule enforcement (e.g., can't publish without variables)
- Error transformation for API responses
- Cross-cutting concern integration (monitoring, caching)

**File Structure**:

```typescript
// src/lib/services/prompt-service.ts

import {
  promptRepository,
  type PromptFilters,
} from '../repositories/prompt-repository';
import { PromptServiceError } from '../errors/prompt-errors';
import { performanceMonitor } from '../monitoring/performance-monitor';

export interface PromptServiceConfig {
  enableCaching?: boolean;
  enableMonitoring?: boolean;
}

export class PromptService {
  private readonly config: Required<PromptServiceConfig>;
  private readonly repository = promptRepository;

  constructor(config: PromptServiceConfig = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      enableMonitoring: config.enableMonitoring ?? true,
    };
  }

  async getPrompts(filters: PromptFilters) {
    const startTime = Date.now();
    try {
      const result = await this.repository.getPrompts(filters);

      // Record metrics
      if (this.config.enableMonitoring) {
        performanceMonitor.recordMetric({
          name: 'prompt_service_get_prompts',
          value: Date.now() - startTime,
          unit: 'ms',
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'getPrompts');
    }
  }

  async createPrompt(userId: string, data: CreatePromptData) {
    // Business validation
    this.validatePromptData(data);

    // Call repository
    return this.repository.createPrompt(userId, data);
  }

  private validatePromptData(data: CreatePromptData): void {
    // Business rules
    // - Template must contain at least one variable
    // - Variable names must be unique
    // - Published prompts must have all required fields
  }

  private handleError(error: unknown, operation: string): PromptServiceError {
    // Transform errors consistently
  }
}

export const promptService = new PromptService();
```

### Phase 3: Refactor API Routes (1 hour)

#### 3.1 Update `src/app/api/prompts/route.ts`

**Changes**:

```typescript
// BEFORE (current)
import { getUserPrompts, createPrompt } from '@/lib/database/queries';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const result = await getUserPrompts(user.id, query);
  return NextResponse.json(result);
}

// AFTER (refactored)
import { promptService } from '@/lib/services/prompt-service';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const result = await promptService.getPrompts({
    userId: user.id,
    ...query,
  });
  return NextResponse.json(result);
}
```

#### 3.2 Update Other Prompt API Routes

Apply same pattern to:

- `src/app/api/prompts/[id]/route.ts` - GET, PUT, DELETE
- `src/app/api/prompts/[id]/execute/route.ts` - POST
- Any other prompt-related API routes

### Phase 4: Update Frontend Types (0.5 hours)

#### 4.1 Create Domain Type Exports

**Create**: `src/types/prompts.ts`

```typescript
// Domain types (not database types)
export interface Prompt {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: VariableDefinition[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
  options?: string[];
}
```

#### 4.2 Update Hooks

```typescript
// BEFORE
import type { ExecutionWithDetails } from '../lib/database/queries';

// AFTER
import type { Prompt } from '../types/prompts';
```

### Phase 5: Testing & Validation (1 hour)

#### 5.1 Unit Tests

Create tests for:

- `prompt-repository.test.ts` - Data transformation, error handling
- `prompt-service.test.ts` - Business logic, validation rules

#### 5.2 Integration Tests

Update:

- `src/__tests__/integration/api/prompts.integration.test.ts`
- Verify all API routes work with new service layer

#### 5.3 Manual Testing

- Create prompt flow
- Update prompt flow
- Delete prompt flow
- Verify caching works
- Verify error handling

---

## Benefits After Refactoring

### ✅ Improved Maintainability

- Single source of truth for prompt business logic
- Consistent pattern across all domains
- Easier to understand and modify

### ✅ Enhanced Testability

- Can mock service layer in API route tests
- Can mock repository in service tests
- Business logic isolated from data access

### ✅ Better Extensibility

- Add caching to prompts by modifying repository only
- Add monitoring to prompts by modifying service only
- Add new prompt features without touching API routes

### ✅ Reduced Code Duplication

- Business logic centralized in service
- Data transformation centralized in repository
- Validation logic not repeated

### ✅ Consistent Architecture

- Same pattern for prompts and executions
- Clear guidelines for new features
- Easier onboarding for new developers

---

## Migration Strategy

### Option A: Big Bang Migration (Recommended for Portfolio)

- Complete all phases in one PR
- Minimal production risk (portfolio project)
- Clean git history showing architectural improvement
- Estimated time: 4-6 hours

### Option B: Incremental Migration

- Phase 1-2: Create service/repository (no breaking changes)
- Phase 3: Update API routes one at a time
- Phase 4-5: Update frontend and tests
- Lower risk but longer timeline
- Estimated time: Spread over 2-3 days

---

## Success Criteria

### Technical Metrics

- [ ] All prompt API routes use `promptService`
- [ ] No direct imports of `getUserPrompts` or `createPrompt` from API routes
- [ ] Frontend hooks import from `src/types/prompts` not `src/lib/database/queries`
- [ ] Unit test coverage for `PromptService` and `PromptRepository`
- [ ] TypeScript builds with 0 errors
- [ ] All existing tests pass

### Architectural Metrics

- [ ] Execution and Prompt domains follow identical patterns
- [ ] Service layer exists for all major domains
- [ ] Repository layer isolates database access
- [ ] Cross-cutting concerns applied consistently

### Documentation

- [ ] Update `docs/planning/ARCHITECTURE.md` with unified pattern
- [ ] Add JSDoc comments to new service/repository classes
- [ ] Update README.md architecture section if needed

---

## Alternative Approaches Considered

### ❌ Do Nothing

**Pros**: No time investment
**Cons**: Technical debt accumulates, inconsistency persists
**Verdict**: Not recommended for portfolio project

### ❌ Remove Service Layer from Executions

**Pros**: Faster short-term, simpler codebase
**Cons**: Loses benefits of proper layering, reduces code quality
**Verdict**: Regression, not improvement

### ✅ Standardize on Service/Repository Pattern (Recommended)

**Pros**: Best practices, maintainable, extensible, interview-ready
**Cons**: Requires time investment upfront
**Verdict**: Best choice for portfolio quality

---

## References

### Internal Documentation

- `docs/planning/ARCHITECTURE.md` - Current architecture overview
- `src/lib/services/execution-service.ts` - Reference implementation
- `src/lib/repositories/execution-repository.ts` - Reference implementation

### External Resources

- [Layered Architecture Pattern](https://herbertograca.com/2017/08/03/layered-architecture/)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)

---

## Notes for Future Development

### When Adding New Domains

Always follow this pattern:

1. Create repository first (data access)
2. Create service (business logic)
3. Update API routes to use service
4. Create domain types in `src/types/`
5. Write tests for each layer

### When Modifying Existing Code

- If touching prompt code: Consider if refactoring is worth doing first
- If adding features: Follow the execution pattern (service → repository)
- If fixing bugs: May reveal need to refactor sooner

---

**Last Updated**: 2025-10-15
**Author**: Ruben (Portfolio Project)
**Status**: Planning Phase - Ready for Implementation
