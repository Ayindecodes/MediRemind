// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCode, verifyUser } from '@/lib/userStorage';
import { apiError, handleErrors } from '@/lib/api/errors';
import { codeSchema } from '@/lib/validation/auth';
import { parseJsonBody } from '@/lib/validation/request';

export const POST = handleErrors(async (request: NextRequest) => {
  const input = await parseJsonBody(request, codeSchema);
  if (!input.ok) {
    return apiError('invalid_request', input.error);
  }
  const { email, code } = input.data;

  const result = verifyCode(email, code, 'signup');

  if (!result.valid) {
    return apiError('invalid_code', result.error || 'Invalid verification code');
  }

  // Mark user as verified
  const verified = verifyUser(email);

  if (!verified) {
    return apiError('not_found', 'Account not found. Please sign up again.');
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Account verified successfully!',
    },
    { status: 200 },
  );
});
