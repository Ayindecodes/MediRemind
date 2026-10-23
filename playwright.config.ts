// playwright.config.ts
// Browser tests run the production build (next build + next start) against a fake email service.
import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { APP_PORT, EMAIL_PORT } from './e2e/ports';

// The app under test keeps its data here, never in the project's data/ folder
const DATA_DIR = path.join(os.tmpdir(), 'mediremind-e2e-data');

export default defineConfig({
  testDir: './e2e',
  // One test at a time: the JSON-file store isn't safe for parallel writes
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/fake-resend.mjs',
      url: `http://localhost:${EMAIL_PORT}/emails`,
      env: { PORT: String(EMAIL_PORT) },
      // Never reuse whatever happens to be on the port: fail with a clear error instead
      reuseExistingServer: false,
    },
    {
      // Start every run with an empty data folder
      command: `node -e "require('fs').rmSync(process.argv[1], { recursive: true, force: true })" "${DATA_DIR}" && npm run build && npx next start -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        MEDIREMIND_DATA_DIR: DATA_DIR,
        JWT_SECRET: 'e2e-jwt-secret'.padEnd(40, '-'),
        CRON_SECRET: 'e2e-cron-secret'.padEnd(40, '-'),
        RESEND_API_KEY: 're_e2e_fake',
        RESEND_BASE_URL: `http://localhost:${EMAIL_PORT}`,
        NEXT_PUBLIC_APP_URL: `http://localhost:${APP_PORT}`,
      },
    },
  ],
});
