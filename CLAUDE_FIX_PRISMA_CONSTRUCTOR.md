# Claude Code Fix Prompt: PrismaClient Constructor Error Resolution

## Mission

Fix the production error causing the `/executions` page to fail with "Something went wrong" by systematically identifying and resolving the root cause of the `TypeError: i.PrismaClient is not a constructor` error.

## Error Summary from Production

### Primary Error

```
Uncaught (in promise) TypeError: i.PrismaClient is not a constructor
```

**Locations in bundle:**

- `lib-5d59f0756df974f8.js:1:279`
- `lib-5d59f0756df974f8.js:1:362`
- `webpack-04108287d54d1444.js:1:128`
- `page-13a7b537e63f4cb0.js:1:2362`
- `vendors-cf8c929700e5c7b5.js:25:130777`

### Secondary Errors

```
GET https://forma-ops.vercel.app/api/preferences 500 (Internal Server Error)
```

**Occurrences:** 3 times from `layout-2d43b3c9898c1e84.js:1`

### Context

- **URL:** `forma-ops.vercel.app/executions`
- **Error ID:** `error_1759294880652_a3fz4qj`
- **Environment:** Production (Vercel)
- **Impact:** Complete page failure with error boundary triggered

## Investigation Protocol

### Step 1: Map the Import Chain (CRITICAL)

**Objective:** Trace every file that imports or uses `PrismaClient` to find where it's being accessed in client-side code.

**Action Items:**

1. Search for ALL PrismaClient imports:

   ```bash
   grep -r "PrismaClient" src/ --include="*.ts" --include="*.tsx"
   grep -r "@prisma/client" src/ --include="*.ts" --include="*.tsx"
   ```

2. Examine each file found and document:
   - Is it a Client Component (`'use client'`)?
   - Is it a Server Component?
   - Is it an API route?
   - Does it re-export PrismaClient?

3. Build a dependency graph:
   ```
   Example:
   @prisma/client
     -> src/lib/database/client.ts
       -> src/lib/monitoring/logger.ts
         -> src/components/error-boundary.tsx (CLIENT!)
   ```

**Key Files to Check:**

- `src/lib/database/client.ts`
- `src/lib/monitoring/logger.ts`
- `src/components/error-boundary.tsx`
- `src/app/layout.tsx`
- Any file that might import the above

**Critical Question:** Is there a chain where a client component imports something that eventually requires PrismaClient?

### Step 2: Identify the Client/Server Boundary Violation

**Objective:** Find where server-only code (PrismaClient) is being pulled into the client bundle.

**Action Items:**

1. Check each component in the import chain for `'use client'` directive
2. Look for shared utilities used by both client and server
3. Identify any context providers that might import server code
4. Check if layout.tsx or any parent component imports problematic code

**Hypothesis to Test:**

- A client component is importing a utility/logger that conditionally uses Prisma
- The bundler cannot tree-shake the Prisma import even if it's conditionally required
- The recent fix to `logger.ts` might not prevent bundling, only runtime execution

**Files to Examine:**

```typescript
// Check if these patterns exist:
// 1. Client component importing logger
'use client';
import { logger } from '@/lib/monitoring/logger';

// 2. Logger importing database client
import { prisma } from '@/lib/database/client';

// 3. Conditional require that still bundles
const getPrisma = () => {
  if (typeof window === 'undefined') {
    return require('@/lib/database/client').prisma; // STILL GETS BUNDLED!
  }
  return null;
};
```

### Step 3: Analyze the Recent "Fix" That May Have Introduced This

**Context:** Recent commits (bbf1200, 51264b9) attempted to fix Prisma bundling issues.

**Action Items:**

1. Read the current state of `src/lib/monitoring/logger.ts`
2. Identify if the conditional import strategy is flawed
3. Check if `next.config.js` webpack alias is working correctly
4. Verify if `error-boundary.tsx` or other client components import the logger

**Critical Analysis:**

```typescript
// Current approach (probably in logger.ts):
const getPrisma = () => {
  if (typeof window === 'undefined') {
    return require('@/lib/database/client').prisma;
  }
  return null;
};

// PROBLEM: webpack still bundles the require() because it's in the module
// Even though it won't execute, the bundle includes @prisma/client
// When bundled for browser, PrismaClient becomes undefined or malformed
```

**Question to Answer:** Does the conditional require actually prevent bundling, or just prevent execution?

### Step 4: Review Current Configuration

**Action Items:**

1. Read `next.config.js` - check for:
   - `serverExternalPackages` or `experimental.serverComponentsExternalPackages`
   - webpack configuration with aliases
   - Any Prisma-specific settings

2. Read `vercel.json` - check for:
   - Serverless function configuration
   - Environment variable handling

3. Read `package.json` - check for:
   - Prisma version
   - `server-only` package
   - Build scripts

**Expected Findings:**

- Current webpack alias may be insufficient
- Missing proper server/client code separation
- Conditional imports still trigger bundling

### Step 5: Determine the Root Cause

**Based on evidence from Steps 1-4, identify ONE of these root causes:**

**A. Client Component Importing Server Code**

- Evidence: Client component (`'use client'`) directly or indirectly imports PrismaClient
- Example: `error-boundary.tsx` imports `logger.ts` which requires Prisma

**B. Insufficient Code Splitting**

- Evidence: Conditional require/import doesn't prevent bundling
- Example: webpack bundles the require even though it's behind typeof check

**C. Webpack Configuration Issue**

- Evidence: Next.js config doesn't properly externalize Prisma
- Example: Missing `serverExternalPackages` for `@prisma/client`

**D. Export/Import Pattern Issue**

- Evidence: PrismaClient is being re-exported incorrectly
- Example: Default vs named export mismatch in client.ts

### Step 6: Implement the Correct Fix

**Based on the root cause identified, implement ONE of these solutions:**

#### Solution A: Complete Server/Client Separation

If client components import server-only utilities:

1. **Create separate client-safe logger:**

   ```typescript
   // src/lib/monitoring/logger.client.ts
   'use client';

   export const logger = {
     error: (message: string, meta?: any) => {
       console.error(message, meta);
     },
     // ... other methods without Prisma
   };
   ```

2. **Keep server logger separate:**

   ```typescript
   // src/lib/monitoring/logger.server.ts
   import 'server-only';
   import { prisma } from '@/lib/database/client';

   export const logger = {
     error: async (message: string, meta?: any) => {
       await prisma.executionLog.create({
         /* ... */
       });
     },
   };
   ```

3. **Update imports in client vs server files:**
   - Client components: `import { logger } from '@/lib/monitoring/logger.client'`
   - Server components: `import { logger } from '@/lib/monitoring/logger.server'`

#### Solution B: Fix Conditional Import Strategy

If conditional imports are still bundling:

1. **Use dynamic import() instead of require():**

   ```typescript
   // src/lib/monitoring/logger.ts
   const getPrismaLogger = async () => {
     if (typeof window === 'undefined') {
       const { prisma } = await import('@/lib/database/client');
       return prisma;
     }
     return null;
   };
   ```

2. **Mark database client with server-only:**

   ```typescript
   // src/lib/database/client.ts
   import 'server-only';
   import { PrismaClient } from '@prisma/client';

   // ... rest of code
   ```

#### Solution C: Enhance Webpack Configuration

If bundling configuration is insufficient:

1. **Update next.config.js:**

   ```javascript
   module.exports = {
     experimental: {
       serverComponentsExternalPackages: ['@prisma/client', '@prisma/engines'],
     },
     webpack: (config, { isServer }) => {
       if (!isServer) {
         // Completely replace server-only modules with empty objects on client
         config.resolve.alias = {
           ...config.resolve.alias,
           '@/lib/database/client': false,
           '@prisma/client': false,
         };
       }
       return config;
     },
   };
   ```

2. **Add fallback for client-side:**
   ```typescript
   // src/lib/database/client.ts
   if (typeof window !== 'undefined') {
     throw new Error('Database client cannot be used on the client side');
   }
   ```

#### Solution D: Fix Export Pattern

If there's an export/import mismatch:

1. **Ensure consistent exports:**

   ```typescript
   // src/lib/database/client.ts
   export const prisma = new PrismaClient(); // Named export
   // NOT: export default prisma
   ```

2. **Verify imports match:**

   ```typescript
   // Correct
   import { prisma } from '@/lib/database/client';

   // NOT: import prisma from '@/lib/database/client'
   ```

### Step 7: Verify the Fix

**Action Items:**

1. Build the application locally:

   ```bash
   npm run build
   ```

2. Check the build output for Prisma bundling warnings

3. Test locally:

   ```bash
   npm run start
   ```

4. Navigate to `/executions` page and verify:
   - No console errors
   - Page loads successfully
   - `/api/preferences` returns 200 status

5. Deploy to Vercel and test production URL

## Implementation Guidelines

### DO:

✅ **Read all relevant files before making changes**
✅ **Trace the complete import chain systematically**
✅ **Identify the exact root cause with evidence**
✅ **Implement the minimal fix that addresses the root cause**
✅ **Test the fix locally before suggesting deployment**
✅ **Document why the previous fix didn't work**

### DO NOT:

❌ **Make assumptions about which file is causing the issue**
❌ **Implement multiple solutions at once**
❌ **Skip reading the actual code in favor of assumptions**
❌ **Apply a fix without understanding why it works**
❌ **Ignore the import chain analysis**

## Expected Workflow

1. **Investigation Phase (Steps 1-5)**
   - Read and analyze files
   - Build dependency graph
   - Identify root cause with evidence
   - Document findings

2. **Solution Phase (Step 6)**
   - Choose correct solution based on root cause
   - Implement changes to specific files
   - Explain why this solution addresses the root cause

3. **Verification Phase (Step 7)**
   - Build and test locally
   - Verify no new errors
   - Confirm production deployment works

## Success Criteria

After implementing the fix:

✅ **No Build Errors**: `npm run build` completes without Prisma bundling warnings
✅ **No Runtime Errors**: Console shows no "PrismaClient is not a constructor" errors
✅ **Page Loads**: `/executions` page renders successfully
✅ **API Works**: `/api/preferences` returns 200 status instead of 500
✅ **Error Boundary Not Triggered**: No "Something went wrong" page
✅ **Production Deployment**: Vercel deployment works without errors

## Context About Previous Attempts

### Previous Fix (Commits bbf1200 & 51264b9)

**What was tried:**

- Added conditional import in `logger.ts` using `typeof window === 'undefined'`
- Added webpack alias in `next.config.js` to exclude database client from client bundle
- Installed `server-only` package
- Set `NEXT_PUBLIC_IS_TEST_MODE` in playwright config

**Why it didn't fully work:**

- Conditional `require()` statements still get bundled by webpack, even if not executed
- Client components importing the logger still pull in the Prisma dependency
- Webpack aliases may need to be set to `false` instead of path redirects
- Need complete separation of client and server code paths

## File Priority for Investigation

1. **CRITICAL** - `src/lib/monitoring/logger.ts` (likely importing Prisma)
2. **CRITICAL** - `src/components/error-boundary.tsx` (likely a client component importing logger)
3. **CRITICAL** - `src/lib/database/client.ts` (Prisma initialization)
4. **HIGH** - `src/app/layout.tsx` (may be importing problematic code)
5. **HIGH** - `next.config.js` (webpack configuration)
6. **MEDIUM** - `src/app/api/preferences/route.ts` (API endpoint failing with 500)
7. **MEDIUM** - Any context providers in `src/contexts/`

## Start Here

Begin by reading these files in order and building the import dependency graph:

1. `grep -r "PrismaClient" src/ --include="*.ts" --include="*.tsx"`
2. Read `src/lib/monitoring/logger.ts`
3. Read `src/components/error-boundary.tsx`
4. Read `src/lib/database/client.ts`
5. Build the complete import chain
6. Identify where client code meets server code
7. Implement the appropriate solution from Step 6

Remember: **Evidence first, solution second. No assumptions.**
