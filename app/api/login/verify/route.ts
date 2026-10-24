// app/api/login/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCode, getUserByEmail } from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';
import { apiError, handleErrors } from '@/lib/api/errors';
import { codeSchema } from '@/lib/validation/auth';
import { parseJsonBody } from '@/lib/validation/request';
import jwt from 'jsonwebtoken';

export const POST = handleErrors(async (request: NextRequest) => {
  // Read the secret first so a misconfigured server doesn't burn the user's code
  const jwtSecret = getJwtSecret();

  const input = await parseJsonBody(request, codeSchema);
  if (!input.ok) {
    return apiError('invalid_request', input.error);
  }
  const { email, code } = input.data;

  // Login sessions are only created by /api/login after the password is checked
  const result = verifyCode(email, code, 'login');

  if (!result.valid) {
    return apiError('invalid_code', result.error || 'Invalid or expired verification code');
  }

  const user = getUserByEmail(email);
  if (!user) {
    return apiError('not_found', 'Account not found. Please sign up.');
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: '7d' },
  );

  return NextResponse.json({
    success: true,
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
  });
});
