import { NextRequest, NextResponse } from 'next/server';
import { tempUsers } from '@/lib/tempUsers';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email and code are required' },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase();
    const user = tempUsers.get(emailKey);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (Date.now() > user.expiresAt) {
      return NextResponse.json(
        { success: false, message: 'Verification code expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (user.verificationCode !== code) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    user.verified = true;
    tempUsers.set(emailKey, user);

    return NextResponse.json({
      success: true,
      message: 'Account verified successfully!'
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
