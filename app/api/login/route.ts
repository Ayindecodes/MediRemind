import { NextRequest, NextResponse } from 'next/server';
import { tempUsers } from '@/lib/tempUsers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase();
    const user = tempUsers.get(emailKey);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.verified) {
      return NextResponse.json(
        { success: false, message: 'Please verify your email before logging in', needsVerification: true },
        { status: 403 }
      );
    }

    if (user.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    console.log('========================================');
    console.log(`✅ User logged in: ${email}`);
    console.log(`Remember me: ${rememberMe}`);
    console.log('========================================');

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        verified: user.verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
