import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: process.env.E2E_SMS_DRY_RUN === 'true' ? '**/dry-run.spec.ts' : '**/*.spec.ts',
  testIgnore: process.env.E2E_SMS_DRY_RUN === 'true' ? [] : ['**/dry-run.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: `test-results/${process.env.E2E_SMS_DRY_RUN === 'true' ? 'dry' : 'sms'}`,
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: `playwright-report/${process.env.E2E_SMS_DRY_RUN === 'true' ? 'dry' : 'sms'}`,
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
