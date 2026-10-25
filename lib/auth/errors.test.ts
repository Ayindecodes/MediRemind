import type { AuthError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { authError } from './errors';

// The errors local Supabase Auth actually returned (recorded while building Task 37)
const error = (status: number, code: string | undefined, message: string) =>
  ({ name: 'AuthApiError', status, code, message }) as AuthError;

describe('authError', () => {
  it('asks people to wait when they request codes too often, saying how long', () => {
    expect(
      authError(
        error(
          429,
          'over_sms_send_rate_limit',
          'For security purposes, you can only request this after 59 seconds.',
        ),
      ),
    ).toMatchObject({
      code: 'too_many_attempts',
      message: 'Please wait 59 seconds before asking for another code.',
    });
  });

  it('explains a wrong or expired code', () => {
    expect(authError(error(403, 'otp_expired', 'Token has expired or is invalid'))).toMatchObject({
      code: 'invalid_code',
    });
  });

  it('says when no account uses the number', () => {
    expect(authError(error(422, 'otp_disabled', 'Signups not allowed for otp'))).toMatchObject({
      code: 'not_found',
      message: 'No account uses this number. Check it, or sign up.',
    });
  });

  it('says when the SMS could not be sent', () => {
    expect(
      authError(error(422, 'hook_timeout', 'Failed to reach hook within maximum time')),
    ).toMatchObject({ code: 'sms_failed' });
    expect(authError(error(502, undefined, 'Bad gateway'))).toMatchObject({ code: 'sms_failed' });
  });

  it("treats anything else as a server error, without Supabase's own message", () => {
    const result = authError(error(500, undefined, 'Database error saving new user'));
    expect(result.code).toBe('server_error');
    expect(result.message).not.toContain('Database');
  });
});
