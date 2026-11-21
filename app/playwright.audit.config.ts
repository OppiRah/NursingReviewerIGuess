import { defineConfig, devices } from '@playwright/test';

// AUDIT-001 browser reproduction checks. Not part of `npm run test:e2e`; run with `npm run test:audit:e2e`.
const PORT = 4173;
export default defineConfig({
  testDir: 'tests/audit/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  globalSetup: './scripts/gen-fixtures.mjs',
  use: { baseURL: `http://localhost:${PORT}`, serviceWorkers: 'block' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run build && npm run preview', url: `http://localhost:${PORT}`, reuseExistingServer: false, timeout: 180_000 },
});
