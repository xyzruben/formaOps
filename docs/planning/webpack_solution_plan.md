# Webpack Module Loading Fix Plan

## Problem Summary

**Error:** `TypeError: Cannot read properties of undefined (reading 'call')` during webpack module loading
**Impact:** Application fails to load on localhost:3000
**Priority:** Critical - blocking all development

## Root Cause Investigation (5 minutes)

### Step 1: Verify the Actual Problem

```bash
# Check for basic issues first
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### Step 2: Identify Import Issues

```bash
# Find actual circular dependencies
npx madge --circular src/
# Check specific imports mentioned in error
grep -r "testAuthManager" src/
grep -r "AuthContext" src/lib/auth/
```

### Step 3: Validate Error Source

- Check browser console for specific module that fails to load
- Verify which line in AuthContext.tsx:9 is actually causing the issue
- Confirm if test-mock import is the real culprit

## Immediate Fix (15 minutes)

### Option A: Comment Out Problematic Import (2 minutes)

```typescript
// In src/contexts/AuthContext.tsx, temporarily comment:
// import { testAuthManager, type MockUser, type MockAuthState } from '@/lib/auth/test-mock';
```

### Option B: Dynamic Import (5 minutes)

```typescript
// Replace static import with dynamic import in AuthContext.tsx
const getTestAuthManager = async () => {
  if (process.env.NEXT_PUBLIC_IS_TEST_MODE === 'true') {
    const { testAuthManager } = await import('@/lib/auth/test-mock');
    return testAuthManager;
  }
  return null;
};
```

### Option C: Check Environment Variables (2 minutes)

```bash
# Verify .env.local exists and has correct values
cat .env.local | grep NEXT_PUBLIC_IS_TEST_MODE
```

## Validation Steps (5 minutes)

1. **Test the fix:** `npm run dev` - app should load
2. **Check console:** No webpack errors in browser
3. **Verify auth:** Login/register flow works
4. **Test hot reload:** Make a small change, verify it reloads

## If Simple Fix Doesn't Work (Only Then Consider)

### Investigate Deeper Issues

- Check if AuthContext has actual circular dependencies
- Verify all imports in the auth module chain are valid
- Look for missing exports or typos in import paths
- Check if Supabase dependencies are properly installed

### Minimal Refactor (30 minutes max)

If circular dependency is confirmed:

1. Extract shared types to `src/lib/auth/types.ts`
2. Remove test-mock import from AuthContext
3. Use dependency injection for test mode

## Success Criteria

- [ ] Application loads successfully on localhost:3000
- [ ] No webpack module loading errors
- [ ] Authentication flow works
- [ ] Development server hot reload works

## What NOT to Do

- ❌ Multi-phase architectural overhaul
- ❌ Dependency injection patterns for a simple import issue
- ❌ Bundle analyzers and CI/CD changes
- ❌ ESLint rules and monitoring systems
- ❌ Weeks of planning for a likely 5-minute fix

## Rollback Plan

If any fix breaks something:

```bash
git checkout HEAD -- src/contexts/AuthContext.tsx
npm run dev
```

## Post-Fix Actions

Once working:

1. **Document the actual cause** (not speculation)
2. **Test thoroughly** to ensure no regression
3. **Consider cleanup** only if absolutely necessary
4. **Move on** to actual feature development

---

**Engineering Principle:** Fix the immediate problem with the minimal change possible. Premature optimization is the root of all evil.
