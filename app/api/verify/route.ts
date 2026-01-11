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
    const userData = tempUsers.get(emailKey);

    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'No pending verification found' },
        { status: 404 }
      );
    }

    if (userData.verificationCode !== code) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    if (Date.now() > userData.expiresAt) {
      return NextResponse.json(
        { success: false, message: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (userData.verified) {
      return NextResponse.json(
        { success: false, message: 'This account is already verified' },
        { status: 400 }
      );
    }

    // Mark as verified
    tempUsers.set(emailKey, {
      ...userData,
      verified: true
    });

    console.log(`✅ User verified: ${email}`);

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