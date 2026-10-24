// app/api/login/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCode, getUserByEmail } from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';
import { codeSchema } from '@/lib/validation/auth';
import { parseJsonBody } from '@/lib/validation/request';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Read the secret first so a misconfigured server doesn't burn the user's code
    const jwtSecret = getJwtSecret();

    const input = await parseJsonBody(request, codeSchema);
    if (!input.ok) {
      return NextResponse.json({ success: false, message: input.error }, { status: 400 });
    }
    const { email, code } = input.data;

    // Login sessions are only created by /api/login after the password is checked
    const result = verifyCode(email, code, 'login');

    if (!result.valid) {
      return NextResponse.json(
        { success: false, message: result.error || 'Invalid or expired verification code' },
        { status: 400 },
      );
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
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
  } catch (error) {
    console.error('Login verification error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
