// app/api/auth/phone/verify/route.ts
// Signing up or logging in by phone, step 2: the code starts a session, kept in httpOnly cookies.
import { NextResponse, type NextRequest } from 'next/server';
import { apiError, handleErrors } from '@/lib/api/errors';
import { authError } from '@/lib/auth/errors';
import { sessionFor } from '@/lib/auth/session';
import { getProfile } from '@/lib/db/profiles';
import { phoneVerifySchema } from '@/lib/validation/auth';
import { parseJsonBody } from '@/lib/validation/request';

export const POST = handleErrors(async (request: NextRequest) => {
  const input = await parseJsonBody(request, phoneVerifySchema);
  if (!input.ok) return apiError('invalid_request', input.error);

  const { db, respond } = sessionFor(request);
  const { data, error } = await db.auth.verifyOtp({
    phone: input.data.phone,
    token: input.data.code,
    type: 'sms',
  });
  if (error) throw authError(error);
  if (!data.user)
    return apiError('server_error', 'Something went wrong on our side. Please try again.');

  return respond(NextResponse.json({ profile: await getProfile(db, data.user.id) }));
});
