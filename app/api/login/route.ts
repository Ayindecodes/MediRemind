// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByEmail,
  verifyPassword,
  createVerificationSession,
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
} from '@/lib/userStorage';
import { escapeHtml, sendEmail } from '@/lib/email';
import { apiError, handleErrors } from '@/lib/api/errors';
import { loginSchema } from '@/lib/validation/auth';
import { parseJsonBody } from '@/lib/validation/request';

export const POST = handleErrors(async (request: NextRequest) => {
  const input = await parseJsonBody(request, loginSchema);
  if (!input.ok) {
    return apiError('invalid_request', input.error);
  }
  const { email, password } = input.data;

  // Check rate limiting
  const rateCheck = checkRateLimit(email);
  if (!rateCheck.allowed) {
    if (rateCheck.blockedMinutes) {
      const minutes = rateCheck.blockedMinutes;
      return apiError(
        'too_many_attempts',
        `Too many failed attempts. Please try again in ${minutes} minutes.`,
        {
          details: { retryAfterMinutes: minutes },
          headers: { 'Retry-After': String(minutes * 60) },
        },
      );
    }
  }

  // Check if user exists
  const user = getUserByEmail(email);
  if (!user) {
    recordFailedAttempt(email);
    return apiError('invalid_credentials', 'Invalid email or password');
  }

  // Check if user is verified
  if (!user.verified) {
    return apiError(
      'email_not_verified',
      'Please verify your email first. Check your inbox for the verification code.',
    );
  }

  // Verify password
  const passwordValid = verifyPassword(email, password);
  if (!passwordValid) {
    recordFailedAttempt(email);
    return apiError('invalid_credentials', 'Invalid email or password');
  }

  // Password is correct - send verification code for additional security
  const verificationCode = createVerificationSession(email, 'login');

  // Send login verification email
  const emailSent = await sendEmail({
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
              
              <h2>Hi ${escapeHtml(user.fullName)}!</h2>
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

  if (emailSent) {
    console.log(`✅ Login verification email sent to ${email}`);
  }

  // Only print codes locally; in production they must only travel by email
  if (process.env.NODE_ENV === 'development') {
    console.log('========================================');
    console.log(`🔐 Login - Verification Code for ${email}`);
    console.log(`Code: ${verificationCode}`);
    console.log('========================================');
  }

  // Reset failed attempts on successful password verification
  resetAttempts(email);

  // In development the code is also printed above, so a failed email doesn't block local testing
  if (!emailSent && process.env.NODE_ENV !== 'development') {
    return apiError(
      'email_failed',
      "We couldn't send your login code. Please try again in a moment.",
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Verification code sent to your email',
      requiresVerification: true,
      ...(process.env.NODE_ENV === 'development' && { debug_code: verificationCode }),
    },
    { status: 200 },
  );
});
