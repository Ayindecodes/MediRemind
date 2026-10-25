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

// Supabase: the project's address and its publishable key are safe in the browser; the secret key is
// server-only, because it has full access and bypasses the access rules
const supabaseUrl = z.preprocess(
  emptyAsUnset,
  z
    .url({
      error: 'NEXT_PUBLIC_SUPABASE_URL is not set. Locally, copy API_URL from `npm run db:status`',
    })
    .transform((url) => url.replace(/\/+$/, '')),
);

const supabasePublishableKey = z.preprocess(
  emptyAsUnset,
  z
    .string({
      error:
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. Locally, copy PUBLISHABLE_KEY from `npm run db:status`',
    })
    .refine(
      (key) => !key.startsWith('sb_secret_'),
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds the secret key, which must never reach the browser. Use the publishable key',
    )
    .refine(
      (key) => key.startsWith('sb_publishable_'),
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable key (sb_publishable_...)',
    ),
);

const supabaseSecretKey = z.preprocess(
  emptyAsUnset,
  z
    .string({
      error: 'SUPABASE_SECRET_KEY is not set. Locally, copy SECRET_KEY from `npm run db:status`',
    })
    .startsWith('sb_secret_', 'SUPABASE_SECRET_KEY must be a secret key (sb_secret_...)'),
);

// Where the database is, and the key that browsers and signed-in requests use
export function getSupabaseConfig(): { url: string; publishableKey: string } {
  return {
    url: read(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: read(supabasePublishableKey, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  };
}

// Full access for server code (lib/db/client.ts); never send it to the browser
export function getSupabaseSecretKey(): string {
  return read(supabaseSecretKey, process.env.SUPABASE_SECRET_KEY);
}

// Termii, which sends SMS (lib/sms.ts). Without an API key, development prints messages instead.
const termii = z.object({
  apiKey: z.string(),
  baseUrl: z
    .url({
      error:
        'TERMII_BASE_URL must be the base URL from your Termii dashboard, e.g. https://v3.api.termii.com',
    })
    .transform((url) => url.replace(/\/+$/, '')),
  senderId: z
    .string({
      error: 'TERMII_SENDER_ID is not set. Use the sender ID Termii approved, e.g. MediRemind',
    })
    .regex(/^[A-Za-z0-9 ]{3,11}$/, 'TERMII_SENDER_ID must be 3 to 11 letters or digits'),
  // 'dnd' reaches numbers on Do-Not-Disturb, which sign-in codes must
  channel: z
    .enum(['dnd', 'generic'], { error: 'TERMII_CHANNEL must be dnd or generic' })
    .default('dnd'),
});

// Termii's settings, or null when TERMII_API_KEY isn't set
export function getTermiiConfig(): z.output<typeof termii> | null {
  const apiKey = emptyAsUnset(process.env.TERMII_API_KEY);
  if (apiKey === undefined) return null;
  return read(termii, {
    apiKey,
    baseUrl: emptyAsUnset(process.env.TERMII_BASE_URL),
    senderId: emptyAsUnset(process.env.TERMII_SENDER_ID),
    channel: emptyAsUnset(process.env.TERMII_CHANNEL),
  });
}

// Signs the calls Supabase Auth makes to the SMS hook (Standard Webhooks: 'v1,whsec_<base64>')
const smsHookSecret = z.preprocess(
  emptyAsUnset,
  z
    .string({
      error:
        'SMS_HOOK_SECRET is not set. Locally, use the secret in supabase/config.toml ([auth.hook.send_sms])',
    })
    .regex(/^v1,whsec_[A-Za-z0-9+/]+=*$/, 'SMS_HOOK_SECRET must look like v1,whsec_<base64>'),
);

export function getSmsHookSecret(): string {
  return read(smsHookSecret, process.env.SMS_HOOK_SECRET);
}

// Everything the server reads. NEXT_PUBLIC_ variables are also visible to browser code; the rest are server-only.
const serverEnv = z.object({
  JWT_SECRET: requiredSecret('JWT_SECRET'),
  // Only needed once a scheduler calls the cron routes, but must be strong if set
  CRON_SECRET: z.preprocess(emptyAsUnset, secretString('CRON_SECRET').optional()),
  RESEND_API_KEY: z.preprocess(emptyAsUnset, z.string().optional()),
  NEXT_PUBLIC_APP_URL: appUrl,
  // The app doesn't use the database yet (Phase 3), so these are optional, but checked if set
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey.optional(),
  SUPABASE_SECRET_KEY: supabaseSecretKey.optional(),
  SMS_HOOK_SECRET: smsHookSecret.optional(),
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
