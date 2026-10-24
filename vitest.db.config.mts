import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The data layer's tests run against the local Supabase stack (`npm run db:start`), so they're kept
// out of `npm test` and run with `npm run test:db`.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    globalSetup: ['tests/db/global-setup.ts'],
    setupFiles: ['tests/db/setup.ts'],
    // Real network calls to the local stack
    testTimeout: 20_000,
    hookTimeout: 30_000,
    restoreMocks: true,
  },
});
