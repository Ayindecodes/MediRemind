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
    exclude: ['node_modules/**', '.next/**'],
    // Every test starts with fresh mocks and environment variables
    restoreMocks: true,
    unstubEnvs: true,
  },
});
