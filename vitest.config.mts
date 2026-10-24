import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Same `@/` import alias as tsconfig.json
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    // tests/db needs the local Supabase stack: `npm run test:db` (vitest.db.config.mts)
    exclude: ['node_modules/**', '.next/**', 'tests/db/**'],
    // Every test starts with fresh mocks and environment variables
    restoreMocks: true,
    unstubEnvs: true,
  },
});
