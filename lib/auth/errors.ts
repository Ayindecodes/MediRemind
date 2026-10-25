// lib/auth/errors.ts
// Turns Supabase Auth's errors into API errors with messages people can act on.
import type { AuthError } from '@supabase/supabase-js';
import { ApiException } from '@/lib/api/errors';

export function authError(error: AuthError): ApiException {
  const { code, status, message } = error;
  const cause = { cause: error };

  // One code a minute per number (supabase/config.toml, max_frequency)
  if (code === 'over_sms_send_rate_limit' || status === 429) {
    const seconds = message.match(/after (\d+) seconds?/)?.[1];
    return new ApiException(
      'too_many_attempts',
      seconds
        ? `Please wait ${seconds} seconds before asking for another code.`
        : 'Please wait a minute before asking for another code.',
      cause,
    );
  }
  if (code === 'otp_expired') {
    return new ApiException(
      'invalid_code',
      'That code is wrong or has expired. Check it, or ask for a new one.',
      cause,
    );
  }
  // Logging in with a number that has no account (sign-ups aren't allowed on the log-in path)
  if (code === 'otp_disabled') {
    return new ApiException(
      'not_found',
      'No account uses this number. Check it, or sign up.',
      cause,
    );
  }
  // The SMS hook failed or couldn't be reached
  if (code?.startsWith('hook_') || status === 502) {
    return new ApiException(
      'sms_failed',
      "We couldn't send your code by SMS. Please try again in a moment.",
      cause,
    );
  }
  return new ApiException(
    'server_error',
    'Something went wrong on our side. Please try again.',
    cause,
  );
}
