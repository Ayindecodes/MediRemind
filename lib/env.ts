// lib/env.ts
// Server-side configuration. Values are read when first needed, so `next build` doesn't require secrets.
import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;

// Treat empty values (e.g. `JWT_SECRET=` in a .env file) as not set
const emptyAsUnset = (value: unknown) => (value === '' ? undefined : value);

const secretString = (name: string) =>
  z
    .string({
      error: `${name} is not set. Add it to .env.local (generate one with: openssl rand -base64 32)`,
    })
    .min(MIN_SECRET_LENGTH, `${name} must be at least ${MIN_SECRET_LENGTH} characters`);

const requiredSecret = (name: string) => z.preprocess(emptyAsUnset, secretString(name));

// Returns the parsed value, or throws an Error with the schema's first message
function read<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues[0].message);
  return result.data;
}

export function getJwtSecret(): string {
  return read(requiredSecret('JWT_SECRET'), process.env.JWT_SECRET);
}

// Shared with the scheduler that calls cron routes (Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`)
export function getCronSecret(): string {
  return read(requiredSecret('CRON_SECRET'), process.env.CRON_SECRET);
}

const appUrl = z.preprocess(
  emptyAsUnset,
  z
    .url({ error: 'NEXT_PUBLIC_APP_URL must be a full URL, e.g. https://mediremind.ng' })
    .transform((url) => url.replace(/\/+$/, ''))
    .optional(),
);

// The app's public address, for links in emails (no trailing slash). Defaults to the local dev server.
export function getAppUrl(): string {
  return read(appUrl, process.env.NEXT_PUBLIC_APP_URL) ?? 'http://localhost:3000';
}

// Everything the server reads. NEXT_PUBLIC_ variables are also visible to browser code; the rest are server-only.
const serverEnv = z.object({
  JWT_SECRET: requiredSecret('JWT_SECRET'),
  // Only needed once a scheduler calls the cron routes, but must be strong if set
  CRON_SECRET: z.preprocess(emptyAsUnset, secretString('CRON_SECRET').optional()),
  RESEND_API_KEY: z.preprocess(emptyAsUnset, z.string().optional()),
  NEXT_PUBLIC_APP_URL: appUrl,
});

/**
 * Checks every variable at once; called when a server instance starts (instrumentation.ts).
 * Throws listing every problem that would break the app, and returns warnings for settings
 * that are optional but expected in production.
 */
export function checkServerEnv(): string[] {
  const result = serverEnv.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const warnings: string[] = [];
  if (process.env.NODE_ENV === 'production') {
    if (!result.data.RESEND_API_KEY) {
      warnings.push(
        'RESEND_API_KEY is not set, so no emails (including sign-in codes) can be sent.',
      );
    }
    if (!result.data.NEXT_PUBLIC_APP_URL) {
      warnings.push(
        'NEXT_PUBLIC_APP_URL is not set, so links in emails point to http://localhost:3000.',
      );
    }
  }
  return warnings;
}
