# Claude Code: Fix Linting Errors in Phase 4 User Preferences System

## Context

You are working on a Next.js/TypeScript project with strict ESLint configuration. The Phase 4: User Preferences System implementation has 96 linting problems (22 errors, 74 warnings) that need to be resolved before the code can be committed to GitHub.

## Current Linting Errors to Fix

### Critical Errors (22 total) - Must Fix:

#### File: `src/app/(dashboard)/settings/page.tsx`

- **Line 29**: `'Upload' is defined but never used` - Remove unused import
- **Line 61**: `'error' is defined but never used` - Remove or prefix with underscore
- **Line 89**: `'error' is defined but never used` - Remove or prefix with underscore
- **Line 108**: `'error' is defined but never used` - Remove or prefix with underscore

#### File: `src/components/execution/__tests__/ai-results-viewer.test.tsx`

- **Line 2**: `'fireEvent' is defined but never used` - Remove unused import
- **Line 2**: `'waitFor' is defined but never used` - Remove unused import
- **Lines 15-16**: `'global' is not defined` - Add proper ESLint disable comments

#### File: `src/components/execution/__tests__/output-display.test.tsx`

- **Line 2**: `'fireEvent' is defined but never used` - Remove unused import

#### File: `src/components/execution/ai-results-demo.tsx`

- **Line 5**: `'Button' is defined but never used` - Remove unused import
- **Line 364**: `'currentExecution' is assigned a value but never used` - Remove or prefix with underscore

#### File: `src/components/execution/ai-results-viewer.tsx`

- **Line 378**: `'options' is defined but never used` - Remove or prefix with underscore

#### File: `src/components/execution/error-display.tsx`

- **Line 226**: `Unexpected lexical declaration in case block` - Wrap in braces

#### File: `src/components/execution/output-display.tsx`

- **Line 81**: `'firstLine' is assigned a value but never used` - Remove or prefix with underscore

#### File: `src/components/execution/results-actions.tsx`

- **Line 99**: `Unexpected lexical declaration in case block` - Wrap in braces
- **Lines 343-344**: `Unexpected lexical declaration in case block` - Wrap in braces
- **Line 419**: `'error' is defined but never used` - Remove or prefix with underscore
- **Line 463**: `'error' is defined but never used` - Remove or prefix with underscore
- **Line 487**: `'error' is defined but never used` - Remove or prefix with underscore

#### File: `src/components/execution/execution-workflow.tsx`

- **Line 137**: `'error' is defined but never used` - Remove or prefix with underscore

#### File: `src/lib/services/execution-service.ts`

- **Line 13**: `'RepositoryListResponse' is defined but never used` - Remove unused import

### Warnings (74 total) - Should Fix:

#### Missing Return Types (30+ instances)

- Add explicit return types to all functions across multiple files
- Files affected: settings/page.tsx, executions pages, components, services

#### Unexpected `any` Types (15+ instances)

- Replace `any` with proper TypeScript types
- Files affected: dashboard/page.tsx, executions pages, components, services

#### Console Statements (10+ instances)

- Replace `console.log` with proper logging or remove
- Files affected: ai-results-demo.tsx, execution-workflow.tsx, execution-websocket.ts

## Requirements

### 1. Fix All Critical Errors First

- Remove unused imports and variables
- Add proper ESLint disable comments where necessary
- Fix lexical declaration issues in case blocks
- Handle unused error variables properly

### 2. Address TypeScript Issues

- Add explicit return types to all functions
- Replace `any` types with proper interfaces/types
- Ensure type safety throughout the codebase

### 3. Clean Up Console Statements

- Replace `console.log` with proper error logging
- Remove development-only console statements
- Use `console.error` for actual error cases

### 4. Maintain Functionality

- Preserve all existing functionality while fixing types
- Ensure error handling remains robust
- Keep user preferences system fully operational

## Files to Fix (Priority Order)

1. **Critical Error Files** (Must fix errors first):
   - `src/app/(dashboard)/settings/page.tsx`
   - `src/components/execution/__tests__/ai-results-viewer.test.tsx`
   - `src/components/execution/__tests__/output-display.test.tsx`
   - `src/components/execution/ai-results-demo.tsx`
   - `src/components/execution/ai-results-viewer.tsx`
   - `src/components/execution/error-display.tsx`
   - `src/components/execution/output-display.tsx`
   - `src/components/execution/results-actions.tsx`
   - `src/components/execution/execution-workflow.tsx`
   - `src/lib/services/execution-service.ts`

2. **Warning Files** (Fix after errors):
   - All other files with missing return types and `any` types
   - Files with console statement violations

## Expected Outcome

- Zero ESLint errors (all 22 errors resolved)
- Minimal warnings (preferably zero)
- All functions have explicit return types
- No `any` types remaining
- Clean, production-ready TypeScript code
- All existing functionality preserved
- User Preferences System remains fully operational

## Validation

After fixes, run:

```bash
npm run lint
npm run type-check
npm test
```

All commands should pass without errors.

## Priority

This is blocking a production deployment of the User Preferences System. Please prioritize:

1. Critical errors (22 errors) first - these block commits
2. Missing return types - improve type safety
3. Replace `any` types with proper types
4. Clean up console statements

Fix all issues systematically and ensure the User Preferences System remains fully functional with improved type safety and code quality.
