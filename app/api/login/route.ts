// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { 
  getUserByEmail, 
  verifyPassword, 
  createVerificationSession,
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts
} from '@/lib/userStorage';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      if (rateCheck.blockedMinutes) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Too many failed attempts. Please try again in ${rateCheck.blockedMinutes} minutes.`,
            blocked: true,
            blockedMinutes: rateCheck.blockedMinutes
          },
          { status: 429 }
        );
      }
    }

    // Check if user exists
    const user = getUserByEmail(email);
    if (!user) {
      recordFailedAttempt(email);
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is verified
    if (!user.verified) {
      return NextResponse.json(
        { success: false, message: 'Please verify your email first. Check your inbox for the verification code.' },
        { status: 403 }
      );
    }

    // Verify password
    const passwordValid = verifyPassword(email, password);
    if (!passwordValid) {
      recordFailedAttempt(email);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid email or password',
          remainingAttempts: rateCheck.remainingAttempts 
        },
        { status: 401 }
      );
    }

    // Password is correct - send verification code for additional security
    const verificationCode = createVerificationSession(email, 'login');

    // Send login verification email
    try {
      await resend.emails.send({
        from: 'MediRemind <onboarding@resend.dev>',
        to: email,
        subject: 'MediRemind Login Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 30px 0; }
                .logo { font-size: 32px; }
                .brand { font-size: 24px; font-weight: bold; background: linear-gradient(to right, #4F46E5, #7C3AED); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .code-box { background: #F3F4F6; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
                .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; }
                .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
                .footer { text-align: center; color: #6B7280; font-size: 14px; margin-top: 40px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">💊</div>
                  <div class="brand">MediRemind</div>
                </div>
                
                <h2>Hi ${user.fullName}!</h2>
                <p>We received a login request for your account. To continue, please enter the verification code below:</p>
                
                <div class="code-box">
                  <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">Your login verification code is:</p>
                  <div class="code">${verificationCode}</div>
                  <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 14px;">This code will expire in 15 minutes</p>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong> If you didn't attempt to log in, please ignore this email and consider changing your password.
                </div>
                
                <div class="footer">
                  <p>© 2025 MediRemind. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log(`✅ Login verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    console.log('========================================');
    console.log(`🔐 Login - Verification Code for ${email}`);
    console.log(`Code: ${verificationCode}`);
    console.log('========================================');

    // Reset failed attempts on successful password verification
    resetAttempts(email);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      requiresVerification: true,
      ...(process.env.NODE_ENV === 'development' && { debug_code: verificationCode })
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}