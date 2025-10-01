# Context Engineering Prompt: PrismaClient Constructor Error Diagnostic

## Error Analysis from Screenshot

### Visual Context

- **URL**: `forma-ops.vercel.app/executions`
- **Page State**: Showing "Something went wrong" error page
- **Error ID**: `error_1759272772554_gpuoyy0`
- **Browser Console**: Multiple uncaught errors and type errors visible

### Primary Error Pattern (from Console)

```
Uncaught (in promise) TypeError: i.PrismaClient is not a constructor
```

This error appears multiple times in the stack trace, originating from different webpack chunks and vendor bundles.

### Secondary Errors

```
Failed to load resource: the server responded with a status of 500 ()
- api/preferences:1 (appears twice)
```

```
TypeError: i.PrismaClient is not a constructor
- Multiple occurrences in:
  - lib-5d59f0756df974f8.js:1:279
  - lib-5d59f0756df974f8.js:1:362
  - webpack-04108287d54d1444.js:1:128
  - page-13a7b537e63f4cb0.js:1:2362
  - vendors-cf8c929700e5c7b5.js:1
```

### Stack Trace Analysis

The error propagates through multiple layers:

1. **Initial attempt** at `lib-5d59f0756df974f8.js:1:279`
2. **Retry/fallback** at line 362 of the same file
3. **Webpack module** at `webpack-04108287d54d1444.js:1:128`
4. **Page bundle** at `page-13a7b537e63f4cb0.js:1:2362`
5. **Vendor bundle** at `vendors-cf8c929700e5c7b5.js:25:130777`

## Diagnostic Mission

Your task is to systematically identify **WHY** `i.PrismaClient` is not a constructor in the production browser environment, without making assumptions about the solution.

## Investigation Framework

### Phase 1: Module Import Analysis

**Objective**: Understand how PrismaClient is being imported and what `i.PrismaClient` refers to in the bundled code.

**Questions to Answer**:

1. What is the exact import statement for PrismaClient in the codebase?
2. Where is PrismaClient being imported? (Which files/components?)
3. Is PrismaClient being imported in client-side code, server-side code, or both?
4. What does the webpack variable `i` represent in the bundle?
5. Is there any re-exporting or barrel export that might transform the import?

**Files to Examine**:

- All files that import `@prisma/client`
- Any database client wrapper files (e.g., `src/lib/database/client.ts`)
- Any components or pages that use the database client
- Any context providers or hooks that might import Prisma

**Diagnostic Commands**:

```bash
# Find all PrismaClient imports
grep -r "import.*PrismaClient" src/
grep -r "from '@prisma/client'" src/
grep -r "require('@prisma/client')" src/
```

### Phase 2: Bundling Configuration Analysis

**Objective**: Determine if PrismaClient is being incorrectly bundled for the browser.

**Questions to Answer**:

1. What is the current webpack configuration in `next.config.js`?
2. Are there any `externals` or `serverExternalPackages` configurations?
3. Is `@prisma/client` marked as server-only?
4. What does the webpack alias configuration show?
5. Are there any conditional imports based on environment?

**Files to Examine**:

- `next.config.js`
- `webpack.config.js` (if exists)
- `vercel.json`
- Any build configuration files

**Specific Checks**:

- Does `next.config.js` have `experimental.serverExternalPackages`?
- Are there webpack aliases that redirect `@prisma/client`?
- Is there a client/server split in the import paths?

### Phase 3: Runtime Environment Analysis

**Objective**: Understand the execution context where the error occurs.

**Questions to Answer**:

1. In which environment is the code trying to instantiate PrismaClient? (Browser vs. Server)
2. Is there a `typeof window` check before using PrismaClient?
3. Are there any client components (`'use client'`) importing server-only code?
4. What is the component tree leading to this error?
5. Is the error in a Client Component, Server Component, or API Route?

**Files to Examine**:

- All files in the stack trace (correlate webpack chunks to source files)
- Any components with `'use client'` directive
- Any shared utilities that might be used in both client and server

**Diagnostic Approach**:

- Map webpack chunks to source files using source maps
- Identify which component is trying to use PrismaClient
- Check the component hierarchy for client/server boundaries

### Phase 4: Export/Import Chain Analysis

**Objective**: Trace the complete import chain to find where the constructor is lost.

**Questions to Answer**:

1. What is the complete chain from `@prisma/client` to the usage point?
2. Are there any intermediate files that re-export PrismaClient?
3. Is PrismaClient destructured incorrectly anywhere?
4. Are there any dynamic imports or lazy loading involved?
5. Is there a default export vs. named export mismatch?

**Example Investigation**:

```
@prisma/client
  -> src/lib/database/client.ts
  -> src/lib/monitoring/logger.ts
  -> src/components/error-boundary.tsx (CLIENT COMPONENT!)
```

**Potential Issues to Check**:

- `export { PrismaClient }` vs `export default PrismaClient`
- `import PrismaClient` vs `import { PrismaClient }`
- Dynamic require statements that lose type information
- Conditional exports based on environment

### Phase 5: Previous Fix Impact Analysis

**Objective**: Understand if recent changes introduced or revealed this issue.

**Questions to Answer**:

1. What was changed in the recent commit (bbf1200 and 51264b9)?
2. Did the logger.ts modifications affect how Prisma is imported?
3. Is the conditional import working as expected?
4. Did the webpack alias change cause this issue?
5. Is there a discrepancy between local and production builds?

**Files to Review**:

- Recent git diff for `src/lib/monitoring/logger.ts`
- Recent git diff for `next.config.js`
- Build logs from Vercel deployment

**Specific Investigation**:

```typescript
// In logger.ts - check if this pattern works correctly
const getPrisma = () => {
  if (typeof window === 'undefined') {
    return require('@/lib/database/client').prisma;
  }
  return null;
};
```

### Phase 6: Module Resolution Analysis

**Objective**: Verify that the module is being resolved correctly in production.

**Questions to Answer**:

1. What does the production bundle actually contain for `@prisma/client`?
2. Is PrismaClient undefined, null, or a different object?
3. What properties does the imported object have?
4. Is there a version mismatch between dependencies?
5. Did the build process generate the Prisma Client correctly?

**Diagnostic Steps**:

- Check the actual webpack bundle contents (if accessible)
- Verify Prisma generation in build logs
- Check package.json for version conflicts
- Review Vercel build logs for any Prisma-related warnings

## Investigation Constraints

**DO NOT**:

- Assume the solution without evidence
- Skip examining any file in the import chain
- Ignore webpack configuration details
- Overlook environment-specific behavior
- Make changes without understanding root cause

**DO**:

- Document every finding with file paths and line numbers
- Create a dependency graph of imports
- Test hypotheses with code examination
- Verify assumptions with grep searches
- Map webpack chunks back to source files

## Data Collection Requirements

For each phase, provide:

1. **Evidence Found**: Exact code snippets with file paths and line numbers
2. **Import Chain**: Complete path from source to usage
3. **Configuration Details**: Relevant webpack/Next.js settings
4. **Environment Context**: Where the code executes (client/server/both)
5. **Hypothesis**: What this evidence suggests about the root cause

## Expected Deliverable Structure

```markdown
## Root Cause Analysis

### 1. Import Chain Discovery

[Complete import path with evidence]

### 2. Bundling Configuration State

[Current webpack/Next.js configuration relevant to Prisma]

### 3. Execution Context

[Where and how PrismaClient is being instantiated]

### 4. The Breaking Point

[Exact location and reason why constructor is not available]

### 5. Contributing Factors

[Any secondary issues that compound the problem]

### 6. Evidence Summary

[All code snippets, configurations, and findings that support the analysis]
```

## Success Criteria for This Investigation

- ✅ **Complete Import Chain Mapped**: Every file from `@prisma/client` to error point documented
- ✅ **Execution Context Identified**: Know exactly where (client/server) the error occurs
- ✅ **Constructor Loss Point Found**: Pinpoint where/how the constructor becomes unavailable
- ✅ **Configuration State Documented**: All relevant webpack/Next.js configs examined
- ✅ **Evidence-Based Conclusion**: Root cause supported by code examination, not assumptions

## Priority Investigation Order

1. **CRITICAL**: Map the complete import chain for PrismaClient
2. **HIGH**: Identify if any client components are importing server-only code
3. **HIGH**: Verify webpack configuration for `@prisma/client`
4. **MEDIUM**: Analyze the recent fixes to understand their impact
5. **MEDIUM**: Check for export/import pattern mismatches
6. **LOW**: Review build logs and deployment configuration

## Tools Required

- `grep` for searching import statements
- `read_file` for examining specific files
- Source map analysis (if available)
- Git history review
- Webpack bundle analyzer (if accessible)

Begin the investigation by mapping the complete import chain, then progressively narrow down to the exact breaking point where `PrismaClient` loses its constructor property.
