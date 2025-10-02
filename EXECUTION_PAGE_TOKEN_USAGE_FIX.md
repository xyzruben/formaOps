# Execution Page Token Usage Fix - TypeError on toLocaleString()

## Executive Summary

**Problem:** JavaScript `TypeError: Cannot read properties of undefined (reading 'toLocaleString')` occurring on the `/executions` page when displaying execution history.

**Root Causes:**

1. **Missing Data Transformation Layer**: `/api/executions` route bypassed the repository layer that properly transforms database records to frontend format
2. **Field Name Mismatch**: Database returns `id` field, frontend expects `executionId`
3. **Null Token Usage**: Database field `tokenUsage` is nullable (`Json?`), but frontend accessed it without null checks
4. **Inconsistent Data Format**: Raw database JSON for `tokenUsage` can have different structures, frontend expected consistent format

**Solution:**

1. Updated `/api/executions` route to use `ExecutionRepository` for proper data transformation
2. Added null safety with optional chaining and fallback values in frontend
3. Extracted `ExecutionServiceError` to standalone module to resolve circular dependencies

---

## Root Cause Analysis

### Investigation Process

1. **Error Trace Analysis**:
   - Error: `Cannot read properties of undefined (reading 'toLocaleString')`
   - Location: `src/app/(dashboard)/executions/page.tsx:374`
   - Code: `execution.tokenUsage.totalTokens.toLocaleString()`

2. **Database Schema Investigation**:
   - Found `tokenUsage Json? @db.JsonB` (nullable field)
   - Field can be `null`, `undefined`, or have incomplete JSON structure

3. **Data Flow Tracing**:
   - API route → `getExecutionHistory()` → Raw database records
   - Repository → `transformExecutionToResult()` → Properly formatted records
   - **Problem**: API route bypassed repository transformation

4. **Repository Pattern Discovery**:
   - Found `ExecutionRepository` with proper transformation logic
   - Discovered `transformTokenUsage()` function that handles null values and format normalization
   - Identified field mapping: `id` → `executionId`

### The Problems

#### Problem 1: Missing Transformation Layer

**File:** `src/app/api/executions/route.ts:5-6`

**Before:**

```typescript
import {
  getExecutionHistory,
  type ExecutionFilters,
} from '../../../lib/database/queries';
```

**Why This Was Wrong:**

- `getExecutionHistory()` returns raw database records with:
  - Field: `id` (not `executionId`)
  - Field: `tokenUsage` as raw nullable JSON
  - No format normalization or defaults

- Frontend expects transformed records with:
  - Field: `executionId`
  - Field: `tokenUsage` as consistent object with defaults
  - All fields properly typed and formatted

#### Problem 2: Null Safety Missing

**File:** `src/app/(dashboard)/executions/page.tsx:374`

**Before:**

```typescript
{
  execution.tokenUsage.totalTokens.toLocaleString();
}
```

**Why This Crashed:**

- When `tokenUsage` is `null`: Accessing `tokenUsage.totalTokens` throws TypeError
- When `tokenUsage` is `{}`: Accessing `totalTokens` returns `undefined`, calling `.toLocaleString()` throws TypeError
- No fallback value for display

#### Problem 3: Circular Dependency

**Files Involved:**

- `src/lib/services/execution-service.ts` (defines ExecutionServiceError, imports execution-repository)
- `src/lib/repositories/execution-repository.ts` (imports ExecutionServiceError from execution-service)

**Why This Was a Problem:**

- Build process couldn't resolve circular import: service → repository → service
- Resulted in: `ReferenceError: Cannot access 'C' before initialization`

---

## Solution Implementation

### Fix 1: Use ExecutionRepository in API Route

**File:** `src/app/api/executions/route.ts`

**Changes:**

```typescript
// OLD - Direct database query
import {
  getExecutionHistory,
  type ExecutionFilters,
} from '../../../lib/database/queries';

const result = await getExecutionHistory(filters);

// NEW - Use repository with transformation
import { ExecutionRepository } from '../../../lib/repositories/execution-repository';

const repository = new ExecutionRepository();
const result = await repository.getExecutions({
  userId: user.id,
  promptId: query.promptId,
  status: query.status,
  page: query.page,
  limit: query.limit,
  from: query.from,
  to: query.to,
});
```

**What This Fixes:**

- ✅ Applies `transformExecutionToResult()` to all records
- ✅ Maps `id` → `executionId`
- ✅ Normalizes `tokenUsage` with defaults: `{ inputTokens: 0, outputTokens: 0, totalTokens: 0 }`
- ✅ Handles various tokenUsage JSON formats from database
- ✅ Provides consistent data structure to frontend

### Fix 2: Add Null Safety in Frontend

**File:** `src/app/(dashboard)/executions/page.tsx:374`

**Changes:**

```typescript
// OLD - No null safety
{
  execution.tokenUsage.totalTokens.toLocaleString();
}

// NEW - Optional chaining + nullish coalescing
{
  (execution.tokenUsage?.totalTokens ?? 0).toLocaleString();
}
```

**What This Fixes:**

- ✅ `?.` optional chaining: Returns `undefined` if `tokenUsage` is null/undefined (no crash)
- ✅ `?? 0` nullish coalescing: Provides fallback value of 0 if `totalTokens` is undefined
- ✅ Graceful degradation: Shows "0" instead of crashing
- ✅ Defense in depth: Protects against edge cases even if repository transformation fails

### Fix 3: Extract Error Class to Standalone Module

**New File:** `src/lib/errors/execution-errors.ts`

**Purpose:** Break circular dependency between execution-service and execution-repository

**Contents:**

```typescript
export class ExecutionServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string = 'EXECUTION_SERVICE_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ExecutionServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
  }
}
```

**Updated Imports:**

```typescript
// src/lib/repositories/execution-repository.ts
import { ExecutionServiceError } from '../errors/execution-errors';

// src/lib/services/execution-service.ts
import { ExecutionServiceError } from '../errors/execution-errors';
export { ExecutionServiceError }; // Re-export for backward compatibility
```

**What This Fixes:**

- ✅ Breaks circular dependency: errors ← service, errors ← repository (no cycle)
- ✅ Build completes successfully
- ✅ Maintains backward compatibility with re-export
- ✅ Cleaner architecture: shared errors in dedicated module

---

## How ExecutionRepository Transforms Data

### Database Format (from Prisma)

```typescript
{
  id: "abc-123",              // Database primary key
  status: "COMPLETED",
  output: "AI response...",
  tokenUsage: {               // Nullable JSON, various formats
    input: 100,
    output: 50,
    total: 150,
    model: "gpt-4"
  } | null,
  costUsd: Decimal(0.002),
  validationStatus: "PASSED",
  latencyMs: 1234,
  createdAt: Date,
  // ... other fields
}
```

### Frontend Format (after transformation)

```typescript
{
  executionId: "abc-123",     // Mapped from id
  status: "COMPLETED",
  output: "AI response...",
  tokenUsage: {               // Always consistent object
    inputTokens: 100,         // Normalized field names
    outputTokens: 50,
    totalTokens: 150          // Guaranteed to exist
  },
  costUsd: 0.002,             // Converted from Decimal
  validationStatus: "PASSED",
  validationErrors: [],
  executionData: {            // Extracted and structured
    inputs: {...},
    model: "gpt-4",
    maxTokens: 2000,
    temperature: 0.7,
    prompt: { id, name }
  },
  timestamp: "2025-10-02T...", // ISO string
  executionTime: 1234,
  latencyMs: 1234,
}
```

### Transformation Logic (from execution-repository.ts:75-106)

```typescript
const transformTokenUsage = (): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} => {
  // Handle null tokenUsage
  if (!dbExecution.tokenUsage) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  // Handle different JSON formats from database
  const tokenData = dbExecution.tokenUsage as {
    input?: number;
    inputTokens?: number;
    output?: number;
    outputTokens?: number;
    total?: number;
    totalTokens?: number;
  } | null;

  return {
    inputTokens: tokenData?.input || tokenData?.inputTokens || 0,
    outputTokens: tokenData?.output || tokenData?.outputTokens || 0,
    totalTokens:
      tokenData?.total ||
      tokenData?.totalTokens ||
      (tokenData?.input || 0) + (tokenData?.output || 0),
  };
};
```

**Key Features:**

- ✅ Null-safe: Returns defaults when tokenUsage is null
- ✅ Format-agnostic: Handles `input/output/total` OR `inputTokens/outputTokens/totalTokens`
- ✅ Calculates missing values: Computes `totalTokens` from input + output if not present
- ✅ Always returns valid object: Frontend can safely access all fields

---

## Verification

### Build Verification

```bash
npm run type-check  # ✅ Passed
npm run build       # ✅ Succeeded
```

### Expected Behavior After Fix

**Scenario 1: Normal Execution with Token Usage**

Database record:

```json
{
  "id": "exec-123",
  "tokenUsage": { "input": 100, "output": 50, "total": 150 }
}
```

Frontend displays:

```
Tokens: 150
```

**Scenario 2: Execution with Null Token Usage**

Database record:

```json
{
  "id": "exec-456",
  "tokenUsage": null
}
```

Frontend displays:

```
Tokens: 0
```

**Scenario 3: Execution with Incomplete Token Usage**

Database record:

```json
{
  "id": "exec-789",
  "tokenUsage": { "input": 100, "output": 50 }
}
```

Frontend displays:

```
Tokens: 150
```

(Calculated: 100 + 50 = 150)

---

## Architecture Alignment

### Repository Pattern Implementation

**Before:** API routes directly called database queries

```
API Route → getExecutionHistory() → Raw DB Records → Frontend
```

**After:** API routes use repository layer

```
API Route → ExecutionRepository → transformExecutionToResult() → Formatted Records → Frontend
```

**Benefits:**

- ✅ Separation of concerns: Database logic separate from API logic
- ✅ Consistent data transformation: All execution endpoints use same transformation
- ✅ Type safety: Repository ensures correct types for frontend
- ✅ Maintainability: Change transformation logic in one place

### Alignment with `/docs/planning/ARCHITECTURE.md`

**Data Layer** (Architecture line 200-250):

- ✅ Uses repository pattern for data access
- ✅ Prisma for database queries
- ✅ Type-safe data transformations

**Error Handling** (Architecture line 450-480):

- ✅ Custom error classes (ExecutionServiceError)
- ✅ Proper error propagation through layers
- ✅ Structured error responses

**Frontend Defensive Programming**:

- ✅ Null-safe property access with optional chaining
- ✅ Fallback values with nullish coalescing
- ✅ Graceful degradation on errors

---

## Related Files

| File                                           | Role         | Changes                                               |
| ---------------------------------------------- | ------------ | ----------------------------------------------------- |
| `src/app/api/executions/route.ts`              | **MODIFIED** | Use ExecutionRepository instead of direct DB query    |
| `src/app/(dashboard)/executions/page.tsx`      | **MODIFIED** | Added null safety: `tokenUsage?.totalTokens ?? 0`     |
| `src/lib/errors/execution-errors.ts`           | **CREATED**  | Extracted ExecutionServiceError to break circular dep |
| `src/lib/services/execution-service.ts`        | **MODIFIED** | Import + re-export error from standalone module       |
| `src/lib/repositories/execution-repository.ts` | **MODIFIED** | Import error from standalone module                   |

**Total Files Changed:** 5 (3 modified, 1 created, 1 refactored)

---

## Testing Checklist

### Manual Testing

- [ ] Load `/executions` page - should display without JavaScript errors
- [ ] View executions with valid tokenUsage - should show correct token counts
- [ ] View executions with null tokenUsage - should show "0" tokens gracefully
- [ ] Switch between tabs (All/Running/Completed/Failed) - should work smoothly
- [ ] Navigate through pagination - should display all executions correctly
- [ ] Check browser console - no TypeError or undefined property errors

### Automated Testing (Future)

```typescript
// tests/integration/executions-page.test.ts
describe('Executions Page - Token Usage Display', () => {
  it('should display token count for executions with tokenUsage', async () => {
    const execution = {
      executionId: 'test-123',
      tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    };

    render(<ExecutionCard execution={execution} />);

    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should display 0 for executions with null tokenUsage', async () => {
    const execution = {
      executionId: 'test-456',
      tokenUsage: null,
    };

    render(<ExecutionCard execution={execution} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should display 0 for executions with undefined totalTokens', async () => {
    const execution = {
      executionId: 'test-789',
      tokenUsage: { inputTokens: 100, outputTokens: 50 },
    };

    render(<ExecutionCard execution={execution} />);

    // Should calculate: 100 + 50 = 150
    expect(screen.getByText('150')).toBeInTheDocument();
  });
});
```

---

## Success Criteria

✅ TypeScript check passes
✅ Production build succeeds
✅ No circular dependency errors
⏳ Executions page loads without JavaScript errors (verify in production)
⏳ Token counts display correctly for all execution states (verify in production)
⏳ No console errors when viewing execution history (verify in production)

---

## Lessons Learned

### 1. Always Use Repository Layer for Data Transformation

**Problem:** API route directly called database query, bypassing transformation logic

**Better Approach:**

- Use repository pattern consistently across all API routes
- Repository handles: field mapping, type conversion, format normalization, default values
- API routes should be thin: authentication → repository → response
- Never expose raw database records to frontend

### 2. Defensive Programming in Frontend

**Problem:** Assumed all fields always exist and have expected structure

**Better Approach:**

- Always use optional chaining (`?.`) for potentially null/undefined fields
- Always provide fallback values with nullish coalescing (`?? defaultValue`)
- Validate data structure from API before using
- Add TypeScript strict mode checks

### 3. Avoid Circular Dependencies

**Problem:** Service and repository importing from each other

**Better Approach:**

- Extract shared code (errors, types, utilities) to separate modules
- Dependency direction: errors ← repository ← service ← API
- Use interfaces for dependency inversion when needed
- Run build frequently during development to catch circular deps early

### 4. Database Schema Design

**Problem:** Nullable JSON field with inconsistent structure

**Better Approach:**

- Document expected JSON structure in schema comments
- Consider separate fields for critical data (inputTokens, outputTokens, totalTokens)
- Add database constraints or triggers to ensure JSON structure
- Use Prisma's `@default` for nullable fields when possible

### 5. Error Investigation Process

**Systematic Approach That Worked:**

1. ✅ Analyze error message and stack trace
2. ✅ Find exact line of code causing error
3. ✅ Trace data flow from database to frontend
4. ✅ Identify transformation layer (or lack thereof)
5. ✅ Verify expected vs actual data structure
6. ✅ Implement fix at root cause (not just symptom)
7. ✅ Add defensive measures for similar issues

---

## Future Improvements

### 1. Add Repository Layer to All API Routes

**Current State:** Some routes still use direct database queries

**Recommended:**

- Audit all `/api/*` routes
- Refactor to use repository pattern consistently
- Ensure all data transformations happen in repositories

### 2. Improve Database Schema

**Current Issue:** `tokenUsage Json?` allows inconsistent structure

**Recommended:**

```prisma
model Execution {
  // Replace nullable JSON with explicit fields
  inputTokens  Int? @default(0)
  outputTokens Int? @default(0)
  totalTokens  Int? @default(0)

  // Or keep JSON but add validation
  tokenUsage Json? @default("{\"inputTokens\":0,\"outputTokens\":0,\"totalTokens\":0}")
}
```

### 3. Add Integration Tests

**Recommended:**

- Test execution list API endpoint
- Test data transformation in repository
- Test frontend rendering with various data states
- Add E2E tests for execution history page

### 4. Add Error Monitoring

**Recommended:**

```typescript
// Log when tokenUsage is null or malformed
if (!execution.tokenUsage) {
  logger.warn('Execution has null tokenUsage', {
    executionId: execution.id,
    status: execution.status,
  });
}
```

---

**Created:** 2025-10-02
**Status:** Ready for Production Deployment
**Priority:** HIGH - User-facing JavaScript crash
**Related Issues:** Execution history display, data transformation consistency
**Related Files:** RATE_LIMIT_FIX.md, EXECUTION_HISTORY_FIX.md, LOGIN_RATE_LIMIT_FIX.md
