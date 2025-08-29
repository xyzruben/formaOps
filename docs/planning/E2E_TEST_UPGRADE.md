# E2E Test Fix Plan

## Problem Summary

E2E tests are failing with ~87% failure rate and taking 10+ minutes. Root cause analysis shows this is primarily configuration and implementation issues, not architectural problems.

## Actual Root Causes

1. **CI Worker Bottleneck**: `workers: process.env.CI ? 1 : 4` - CI runs with 1 worker vs 4 locally
2. **Timeout Issues**: 5-second default timeouts too aggressive for real page loads
3. **Missing UI Components**: Tests expect login forms and validation messages that don't exist
4. **Test Infrastructure**: Basic setup and teardown issues

## Fix Plan (1-2 Weeks Max)

### Week 1: Configuration Fixes (2-3 days)

#### Day 1: Playwright Config Fix

```typescript
// playwright.config.ts - Simple fixes
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : 4, // Fix: Use 4 workers everywhere
  timeout: 30000, // Fix: Realistic 30s timeout
  expect: { timeout: 10000 }, // Fix: 10s assertion timeout
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000, // Fix: 15s action timeout
    navigationTimeout: 30000, // Fix: 30s navigation timeout
  },
  projects: [
    {
      name: 'chromium', // Start with Chrome only
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Expected Result**: 75% performance improvement immediately

#### Day 2-3: Missing UI Components

Based on test failures, implement the missing components:

1. **Login Form Components** (tests expect these):
   - Email/password input fields with proper placeholders
   - Form validation with error messages
   - Sign in button functionality

2. **Authentication Flow** (tests expect these):
   - Login modal or page
   - Success/error states
   - Logout functionality
   - Auth state management

### Week 2: Test Stability (3-4 days)

#### Day 1-2: Test Setup Improvements

```typescript
// Improved beforeEach in test files
test.beforeEach(async ({ page }) => {
  // Wait for app to be ready
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Set up authenticated state properly (instead of just localStorage)
  if (needsAuth) {
    await authenticateUser(page);
  }
});
```

#### Day 3-4: Fix Brittle Selectors

Replace failing selectors with more reliable ones:

```typescript
// Instead of fragile regex selectors like /sign in/i
await page.getByRole('button', { name: 'Sign In' });
await page.getByTestId('email-input'); // Add test-ids to components
await page.getByTestId('password-input');
```

## Implementation Order

### Priority 1: Immediate (1 day)

- [ ] Update `playwright.config.ts` worker and timeout settings
- [ ] Test locally to confirm performance improvement

### Priority 2: UI Components (2-3 days)

- [ ] Add login form components that tests expect
- [ ] Implement form validation messages
- [ ] Add authentication state management

### Priority 3: Test Reliability (2-3 days)

- [ ] Fix test setup/teardown
- [ ] Replace brittle selectors with reliable ones
- [ ] Add proper waits for async operations

### Optional: If Time Permits

- [ ] Add test-ids to key UI elements
- [ ] Improve error handling in tests
- [ ] Add one Firefox test run after Chrome is stable

## Success Metrics

**Performance Target**: <3 minutes total execution time
**Reliability Target**: <10% failure rate
**Timeline**: 1-2 weeks maximum

## What We're NOT Doing

- ❌ Node.js version upgrades
- ❌ Major dependency updates
- ❌ Complex monitoring frameworks
- ❌ Advanced parallelization strategies
- ❌ Multi-phase rollout plans
- ❌ Enterprise risk assessment matrices

## Expected Timeline

- **Day 1**: Config fixes, immediate performance boost
- **Days 2-5**: Add missing UI components
- **Days 6-10**: Stabilize tests, fix selectors
- **Week 2**: Final cleanup and validation

This is a straightforward fix for configuration and implementation issues, not a complex architectural transformation.
