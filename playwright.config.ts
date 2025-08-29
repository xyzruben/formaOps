import { defineConfig, devices } from '@playwright/test';

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
