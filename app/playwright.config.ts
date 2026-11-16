import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  // Builds synthetic .pdf/.docx upload fixtures (Node built-ins only) into e2e/.generated/.
  globalSetup: './scripts/gen-fixtures.mjs',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Deterministic runs: the service worker is covered by build output checks, not by E2E.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Production build + preview: tests run against the same CSP-protected bundle that ships.
    command: 'npm run build && npm run preview',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
