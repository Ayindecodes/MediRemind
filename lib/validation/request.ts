// lib/validation/request.ts
// Reads a request's JSON body and checks it against a zod schema.
import { z } from 'zod';

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Reads the body as JSON and checks it against the schema. On failure, `error` is the first
 * problem found, worded so it can be shown to the user. Fields the schema doesn't list are dropped.
 */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<Parsed<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: 'The request body must be valid JSON' };
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'The request body must be a JSON object' };
  }

  const result = schema.safeParse(body);
  if (!result.success) return { ok: false, error: result.error.issues[0].message };
  return { ok: true, data: result.data };
}

// Empty and whitespace-only strings count as "not given"
export const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

// For edits: an empty string or null means "clear this field"
export const blankToNull = (value: unknown) =>
  value === null || (typeof value === 'string' && value.trim() === '') ? null : value;
