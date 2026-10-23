// app/api/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUser, createVerificationSession, getUserByEmail } from '@/lib/userStorage';
import { escapeHtml, sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password } = await request.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered. Please login instead.' },
        { status: 409 },
      );
    }

    // Create user (unverified)
    createUser(fullName, email, password);

    // Generate verification code
    const verificationCode = createVerificationSession(email, 'signup');

    // Send verification email
    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify Your MediRemind Account',
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
                .footer { text-align: center; color: #6B7280; font-size: 14px; margin-top: 40px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">💊</div>
                  <div class="brand">MediRemind</div>
                </div>
                
                <h2>Hi ${escapeHtml(fullName)}!</h2>
                <p>Thanks for signing up with MediRemind. To complete your registration, please verify your email address.</p>
                
                <div class="code-box">
                  <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">Your verification code is:</p>
                  <div class="code">${verificationCode}</div>
                  <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 14px;">This code will expire in 15 minutes</p>
                </div>
                
                <p>If you didn't request this code, you can safely ignore this email.</p>
                
                <div class="footer">
                  <p>© 2025 MediRemind. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
    });

    if (emailSent) {
      console.log(`✅ Verification email sent to ${email}`);
    }

    // Only print codes locally; in production they must only travel by email
    if (process.env.NODE_ENV === 'development') {
      console.log('========================================');
      console.log(`📧 Signup - Verification Code for ${email}`);
      console.log(`Code: ${verificationCode}`);
      console.log('========================================');
    }

    // In development the code is also printed above, so a failed email doesn't block local testing
    const codeSent = emailSent || process.env.NODE_ENV === 'development';

    // The account exists either way; if the email failed, the user can use "Resend Code"
    return NextResponse.json(
      {
        success: true,
        codeSent,
        message: codeSent
          ? `Verification code sent to ${email}`
          : `Your account was created, but we couldn't send the verification email to ${email}. Tap "Resend Code" to try again.`,
        ...(process.env.NODE_ENV === 'development' && { debug_code: verificationCode }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Signup error:', error);
    const message =
      error instanceof Error && error.message ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
