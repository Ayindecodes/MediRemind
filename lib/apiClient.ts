// lib/apiClient.ts
// Reading API responses in the browser.
import type { ApiError, ApiErrorCode } from './types';

/**
 * The error in a failed response's JSON body. Falls back to `fallback` (with the code 'unknown')
 * when the body isn't an API error, for example an error page from a proxy.
 */
export function errorFrom(
  body: unknown,
  fallback: string,
): { code: ApiErrorCode | 'unknown'; message: string; details?: ApiError['details'] } {
  const error =
    typeof body === 'object' && body !== null ? (body as { error?: unknown }).error : null;
  if (typeof error === 'object' && error !== null) {
    const { code, message, details } = error as Partial<ApiError>;
    if (typeof code === 'string' && typeof message === 'string') {
      return details ? { code, message, details } : { code, message };
    }
  }
  return { code: 'unknown', message: fallback };
}
