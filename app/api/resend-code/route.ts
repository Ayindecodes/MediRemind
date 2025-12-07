import { NextRequest, NextResponse } from 'next/server';
import { tempUsers } from '@/lib/tempUsers';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const emailKey = email.toLowerCase();
    const user = tempUsers.get(emailKey);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    user.expiresAt = Date.now() + 15 * 60 * 1000;
    tempUsers.set(emailKey, user);

    console.log('========================================');
    console.log(`📧 New Verification Code for ${email}`);
    console.log(`Code: ${verificationCode}`);
    console.log('========================================');

    return NextResponse.json({
      success: true,
      message: 'New verification code sent!',
      debug_code: verificationCode
    });

  } catch (error) {
    console.error('Resend error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
