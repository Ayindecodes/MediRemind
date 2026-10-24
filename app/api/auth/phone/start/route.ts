// app/api/auth/phone/start/route.ts
// Signing up or logging in by phone, step 1: Supabase makes a code and the SMS hook sends it.
import { NextResponse, type NextRequest } from 'next/server';
import { apiError, handleErrors } from '@/lib/api/errors';
import { authError } from '@/lib/auth/errors';
import { sessionFor } from '@/lib/auth/session';
import { phoneStartSchema } from '@/lib/validation/auth';
import { parseJsonBody } from '@/lib/validation/request';

export const POST = handleErrors(async (request: NextRequest) => {
  const input = await parseJsonBody(request, phoneStartSchema);
  if (!input.ok) return apiError('invalid_request', input.error);

  const { db, respond } = sessionFor(request);
  const { error } = await db.auth.signInWithOtp({
    phone: input.data.phone,
    options:
      input.data.mode === 'sign_up'
        ? // The name travels to the database, which creates the profile from it
          { shouldCreateUser: true, data: { full_name: input.data.fullName } }
        : // Logging in never creates an account
          { shouldCreateUser: false },
  });
  if (error) throw authError(error);

  return respond(NextResponse.json({ codeSent: true }));
});
