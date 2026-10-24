// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCode, verifyUser } from '@/lib/userStorage';
import { codeSchema } from '@/lib/validation/auth';
import { parseJsonBody } from '@/lib/validation/request';

export async function POST(request: NextRequest) {
  try {
    const input = await parseJsonBody(request, codeSchema);
    if (!input.ok) {
      return NextResponse.json({ success: false, message: input.error }, { status: 400 });
    }
    const { email, code } = input.data;

    const result = verifyCode(email, code, 'signup');

    if (!result.valid) {
      return NextResponse.json(
        { success: false, message: result.error || 'Invalid verification code' },
        { status: 400 },
      );
    }

    // Mark user as verified
    const verified = verifyUser(email);

    if (!verified) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account verified successfully!',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
