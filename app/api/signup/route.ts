import { NextRequest, NextResponse } from 'next/server';
import { tempUsers } from '@/lib/tempUsers';

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password } = await request.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase();

    if (tempUsers.has(emailKey)) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    tempUsers.set(emailKey, {
      fullName,
      email, // store original casing for display
      password, // In production: hash this
      verificationCode,
      verified: false,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 min
    });

    console.log('========================================');
    console.log(`📧 Verification Code for ${email}`);
    console.log(`Code: ${verificationCode}`);
    console.log('========================================');

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${email}`,
      debug_code: verificationCode // Only for testing
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
