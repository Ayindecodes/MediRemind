// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCode, verifyUser } from '@/lib/userStorage';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email and code are required' },
        { status: 400 },
      );
    }

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
