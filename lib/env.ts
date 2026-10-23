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
