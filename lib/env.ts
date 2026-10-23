// lib/env.ts
// Server-side configuration. Values are read when first needed, so `next build` doesn't require secrets.

const MIN_JWT_SECRET_LENGTH = 32;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not set. Add it to .env.local (generate one with: openssl rand -base64 32)');
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }

  return secret;
}
