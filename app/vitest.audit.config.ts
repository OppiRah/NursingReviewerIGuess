import { defineConfig } from 'vitest/config';

// AUDIT-001 reproduction tests. Kept out of `npm test`; run with `npm run test:audit`.
export default defineConfig({
  test: {
    include: ['tests/audit/**/*.audit.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 120_000,
  },
});
