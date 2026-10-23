// lib/env.ts
// Server-side configuration. Values are read when first needed, so `next build` doesn't require secrets.

const MIN_SECRET_LENGTH = 32;

function requiredSecret(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local (generate one with: openssl rand -base64 32)`);
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  return value;
}

export function getJwtSecret(): string {
  return requiredSecret('JWT_SECRET');
}

// Shared with the scheduler that calls cron routes (Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`)
export function getCronSecret(): string {
  return requiredSecret('CRON_SECRET');
}
