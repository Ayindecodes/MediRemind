// lib/api/errors.ts
// Every error the API returns has the same shape: { "error": { code, message, details? } }.
import { NextResponse } from 'next/server';
import type { ApiError, ApiErrorCode } from '@/lib/types';

// Each code always comes with the same HTTP status
const STATUS: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  invalid_code: 400,
  already_verified: 400,
  unauthorized: 401,
  invalid_credentials: 401,
  email_not_verified: 403,
  upgrade_required: 403,
  payments_unavailable: 403,
  not_found: 404,
  email_taken: 409,
  too_many_attempts: 429,
  server_error: 500,
  email_failed: 502,
  sms_failed: 502,
};

// Whether a value is one of the codes above, e.g. a hint raised by a database rule
export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && Object.hasOwn(STATUS, value);
}

/**
 * An error a route can throw (or let through) to answer with a specific code, e.g. a database rule's
 * upgrade_required. handleErrors() turns it into apiError(code, message). Anything else thrown is
 * treated as unexpected.
 */
export class ApiException extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ApiException';
  }
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  { details, headers }: { details?: ApiError['details']; headers?: HeadersInit } = {},
) {
  const error: ApiError = details ? { code, message, details } : { code, message };
  return NextResponse.json({ error }, { status: STATUS[code], headers });
}

/**
 * Wraps a route handler so an unexpected error is logged and answered with a generic 500. The
 * error's own message is never sent, since it can describe the server's internals.
 */
export function handleErrors<Args extends [Request, ...unknown[]]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      // An expected failure, such as a plan limit: answer with its code and message
      if (error instanceof ApiException && error.code !== 'server_error') {
        return apiError(error.code, error.message);
      }
      const [request] = args;
      console.error(`${request.method} ${new URL(request.url).pathname} failed:`, error);
      return apiError('server_error', 'Something went wrong on our side. Please try again.');
    }
  };
}
