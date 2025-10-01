# API Fix: Remove Prisma from Client Bundle

## Executive Summary

**Problem:** Client components directly import `execution-service`, which pulls Prisma into the browser bundle, causing `TypeError: i.PrismaClient is not a constructor`.

**Solution:** Replace direct service imports with `fetch()` calls to existing API routes.

**Impact:** Fixes production error at `/executions` page.

---

## Root Cause Analysis

### Current Architecture (BROKEN)

```
Client Component (Browser)
  ↓ imports
execution-service.ts
  ↓ imports
execution-repository.ts
  ↓ imports
database/queries.ts
  ↓ imports
database/client.ts
  ↓ imports
@prisma/client ❌ FAILS IN BROWSER
```

### Import Chain Evidence

**Production Error Bundle:** `lib-71e413faed9e9379.js`

```
@prisma/client (NPM package)
  ↓
src/lib/database/client.ts:1
  import { PrismaClient } from '@prisma/client';
  ↓
src/lib/database/queries.ts:1
  import { prisma } from './client';
  ↓
src/lib/repositories/execution-repository.ts:8-14
  import { getExecutionHistory, getExecutionById } from '../database/queries';
  ↓
src/lib/services/execution-service.ts:11-12
  import { executionRepository } from '../repositories/execution-repository';
  ↓
IMPORTED BY CLIENT COMPONENTS:
  1. src/app/(dashboard)/executions/page.tsx:21 ('use client')
     await executionService.getExecutions(filters, user.id);
  2. src/app/(dashboard)/executions/[id]/page.tsx:12 ('use client')
     await executionService.getExecutionById(executionId, user.id);
```

### Why Webpack Bundles It

Even though `database/client.ts` has conditional imports:

```typescript
const getPrisma = () => {
  if (typeof window === 'undefined') {
    return require('../database/client').prisma;
  }
  return null;
};
```

**Webpack's static analysis** sees `require('../database/client')` and bundles it regardless of the runtime check.

---

## Target Architecture (CORRECT)

```
Client Component (Browser)
  ↓ fetch()
API Route (Server)
  ↓ imports
execution-service.ts
  ↓ imports
execution-repository.ts
  ↓ imports
database/queries.ts
  ↓ imports
@prisma/client ✅ ONLY ON SERVER
```

---

## Implementation Plan

### Phase 1: Create Client-Safe API Wrapper

**File:** `src/lib/api/execution-client.ts` (NEW FILE)

**Purpose:**

- Provide type-safe API calls to execution endpoints
- Replace direct service imports in client components
- Handle errors consistently

**Implementation:**

```typescript
/**
 * Client-Side Execution API Wrapper
 *
 * This file provides client-safe functions to interact with execution
 * API routes. It should be used by client components instead of directly
 * importing execution-service.
 */

import type { ExecutionResult } from '@/components/execution/ai-results-viewer';

export interface ExecutionFilters {
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  promptId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface ExecutionListResponse {
  executions: ExecutionResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ExecutionAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ExecutionAPIError';
  }
}

/**
 * Fetch execution list with filtering and pagination
 */
export async function getExecutions(
  filters: ExecutionFilters = {}
): Promise<ExecutionListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.promptId) params.append('promptId', filters.promptId);
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);

  const url = `/api/executions?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to fetch executions',
    }));
    throw new ExecutionAPIError(
      error.error || 'Failed to fetch executions',
      response.status,
      error.code
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Fetch execution details by ID
 */
export async function getExecutionById(id: string): Promise<ExecutionResult> {
  if (!id) {
    throw new ExecutionAPIError(
      'Execution ID is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  const response = await fetch(`/api/executions/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to fetch execution',
    }));
    throw new ExecutionAPIError(
      error.error || 'Failed to fetch execution',
      response.status,
      error.code
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Retry a failed execution
 */
export async function retryExecution(id: string): Promise<ExecutionResult> {
  if (!id) {
    throw new ExecutionAPIError(
      'Execution ID is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  const response = await fetch(`/api/executions/${id}/retry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to retry execution',
    }));
    throw new ExecutionAPIError(
      error.error || 'Failed to retry execution',
      response.status,
      error.code
    );
  }

  const data = await response.json();
  return data;
}
```

---

### Phase 2: Update Executions List Page

**File:** `src/app/(dashboard)/executions/page.tsx`

**Changes:**

**BEFORE:**

```typescript
import {
  executionService,
  ExecutionServiceError,
  type ExecutionFilters,
  type ExecutionListResponse,
} from '@/lib/services/execution-service';

// ...

const data = await executionService.getExecutions(filters, user.id);
```

**AFTER:**

```typescript
import {
  getExecutions,
  ExecutionAPIError,
  type ExecutionFilters,
  type ExecutionListResponse,
} from '@/lib/api/execution-client';

// ...

const data = await getExecutions(filters);
// Note: user.id is handled by API route via cookies
```

**Full Changes:**

1. **Line 19-22:** Replace import

```typescript
// OLD
import {
  executionService,
  ExecutionServiceError,
  type ExecutionFilters,
  type ExecutionListResponse,
} from '@/lib/services/execution-service';

// NEW
import {
  getExecutions,
  ExecutionAPIError,
  type ExecutionFilters,
  type ExecutionListResponse,
} from '@/lib/api/execution-client';
```

2. **Line 62:** Replace service call

```typescript
// OLD
const data = await executionService.getExecutions(filters, user.id);

// NEW
const data = await getExecutions(filters);
```

3. **Line 65:** Update error handling

```typescript
// OLD
if (err instanceof ExecutionServiceError) {
  setError(`${err.message} (${err.code})`);
}

// NEW
if (err instanceof ExecutionAPIError) {
  setError(`${err.message} (${err.code || err.statusCode})`);
}
```

---

### Phase 3: Update Execution Detail Page

**File:** `src/app/(dashboard)/executions/[id]/page.tsx`

**Changes:**

**BEFORE:**

```typescript
import {
  executionService,
  ExecutionServiceError,
} from '@/lib/services/execution-service';

// ...

const executionResult = await executionService.getExecutionById(
  executionId,
  user.id
);
```

**AFTER:**

```typescript
import {
  getExecutionById,
  ExecutionAPIError,
} from '@/lib/api/execution-client';

// ...

const executionResult = await getExecutionById(executionId);
```

**Full Changes:**

1. **Line 9-12:** Replace import

```typescript
// OLD
import {
  executionService,
  ExecutionServiceError,
} from '@/lib/services/execution-service';

// NEW
import {
  getExecutionById,
  retryExecution,
  ExecutionAPIError,
} from '@/lib/api/execution-client';
```

2. **Line 42-45:** Replace service call

```typescript
// OLD
const executionResult = await executionService.getExecutionById(
  executionId,
  user.id
);

// NEW
const executionResult = await getExecutionById(executionId);
```

3. **Line 48:** Update error handling

```typescript
// OLD
if (err instanceof ExecutionServiceError) {
  setError(`${err.message} (${err.code})`);
}

// NEW
if (err instanceof ExecutionAPIError) {
  setError(`${err.message} (${err.code || err.statusCode})`);
}
```

4. **If retry functionality exists:** Update retry handler

```typescript
// OLD (if exists)
await executionService.retryExecution(executionId, user.id);

// NEW
await retryExecution(executionId);
```

---

### Phase 4: Verification Checklist

After implementing all changes:

#### Build Verification

```bash
# Clean build
rm -rf .next
npm run build

# Check for Prisma warnings in output
# Should see NO mentions of Prisma in client bundles
```

#### Type Check

```bash
npm run type-check
# Should pass with no errors
```

#### E2E Tests

```bash
npm run test:e2e
# All 30 tests should pass
```

#### Local Testing

```bash
npm run build
npm run start

# Test these URLs:
# 1. http://localhost:3000/executions
#    - Should load execution list
#    - Should show filters/pagination
#    - No console errors about PrismaClient
#
# 2. http://localhost:3000/executions/[id]
#    - Should load execution details
#    - Should show AI results
#    - No console errors
```

#### Production Testing (After Deploy)

```bash
# Check production at:
# https://forma-ops.vercel.app/executions

# Verify:
✅ Page loads without error boundary
✅ Executions list displays
✅ No "PrismaClient is not a constructor" in console
✅ API calls to /api/executions work (check Network tab)
✅ Clicking execution shows details
```

---

## Why This Solution Works

### Problem: Webpack Bundles Everything

```typescript
// In logger.ts or any file imported by client:
const getPrisma = () => {
  if (typeof window === 'undefined') {
    return require('../database/client').prisma; // ❌ WEBPACK SEES THIS
  }
  return null;
};
```

**Webpack's static analysis includes the `require()` in the bundle regardless of runtime conditions.**

### Solution: Complete Separation

```typescript
// Client components:
import { getExecutions } from '@/lib/api/execution-client'; // ✅ No Prisma

// API routes:
import { executionService } from '@/lib/services/execution-service'; // ✅ Has Prisma, but only on server
```

**No import path from client to Prisma = No Prisma in client bundle.**

---

## File Changes Summary

| File                                           | Action     | Purpose                        |
| ---------------------------------------------- | ---------- | ------------------------------ |
| `src/lib/api/execution-client.ts`              | **CREATE** | Client-safe API wrapper        |
| `src/app/(dashboard)/executions/page.tsx`      | **EDIT**   | Replace service with API calls |
| `src/app/(dashboard)/executions/[id]/page.tsx` | **EDIT**   | Replace service with API calls |

**Total Files Changed:** 3 (1 new, 2 modified)

---

## Rollback Plan

If issues arise after deployment:

1. **Revert Git Commit:**

```bash
git revert HEAD
git push origin main
```

2. **Quick Fix:** Add this to `next.config.js` temporarily:

```javascript
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib/services/execution-service': false,
      '@/lib/repositories/execution-repository': false,
      '@/lib/database/queries': false,
    };
  }
  return config;
};
```

---

## Post-Implementation

### Monitoring

After deployment, monitor:

- Vercel deployment logs
- Browser console errors (Sentry/LogRocket)
- `/api/executions` endpoint response times
- User reports of `/executions` page issues

### Future Improvements

1. **Server Actions:** Consider migrating to Next.js Server Actions for type safety
2. **API Client Library:** Create a comprehensive API client for all endpoints
3. **Error Handling:** Add retry logic and better error messages
4. **Loading States:** Add optimistic updates and skeleton screens

---

## References

- [Next.js App Router Best Practices](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Prisma Client Edge Limitations](https://www.prisma.io/docs/guides/deployment/edge)
- [Webpack Module Resolution](https://webpack.js.org/concepts/module-resolution/)

---

## Success Criteria

✅ Build completes without Prisma warnings
✅ Type check passes
✅ E2E tests pass
✅ `/executions` page loads in production
✅ No "PrismaClient is not a constructor" errors
✅ API calls return correct data
✅ Execution details page works

---

**Last Updated:** 2025-10-01
**Status:** Ready for Implementation
