// lib/webhooks.ts
// Verifies Standard Webhooks signatures (https://www.standardwebhooks.com), which Supabase Auth's
// hooks use.
import { createHmac, timingSafeEqual } from 'node:crypto';

// How far a webhook's timestamp may be from now, so an old request can't be replayed
const TOLERANCE_SECONDS = 5 * 60;

/**
 * Whether a webhook request is genuine: signed with `secret` ('v1,whsec_<base64>') over
 * `<webhook-id>.<webhook-timestamp>.<body>`, and sent within five minutes of `now`.
 */
export function verifyWebhook(
  secret: string,
  headers: Headers,
  body: string,
  now = Date.now(),
): boolean {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signatures = headers.get('webhook-signature');
  if (!id || !timestamp || !signatures) return false;

  const seconds = Number(timestamp);
  if (!Number.isInteger(seconds) || Math.abs(now / 1000 - seconds) > TOLERANCE_SECONDS) {
    return false;
  }

  const key = Buffer.from(secret.replace(/^v1,/, '').replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();

  // The header can hold several space-separated signatures, e.g. while a secret is being rotated
  return signatures.split(' ').some((entry) => {
    const [version, signature] = entry.split(',');
    if (version !== 'v1' || !signature) return false;
    const received = Buffer.from(signature, 'base64');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}
