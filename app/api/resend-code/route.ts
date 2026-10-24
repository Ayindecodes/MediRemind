// app/api/resend-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createVerificationSession, getUserByEmail } from '@/lib/userStorage';
import { escapeHtml, sendEmail } from '@/lib/email';
import { apiError, handleErrors } from '@/lib/api/errors';
import { resendCodeSchema } from '@/lib/validation/auth';
import { parseJsonBody } from '@/lib/validation/request';

export const POST = handleErrors(async (request: NextRequest) => {
  // Only signup codes can be resent: login codes are issued by /api/login, after the password
  const input = await parseJsonBody(request, resendCodeSchema);
  if (!input.ok) {
    return apiError('invalid_request', input.error);
  }
  const { email } = input.data;

  // Check if user exists
  const user = getUserByEmail(email);
  if (!user) {
    return apiError('not_found', 'No account found for this email. Please sign up.');
  }

  // Codes are stored per email, so a new signup code would overwrite a pending login code
  if (user.verified) {
    return apiError('already_verified', 'Account already verified. Please log in.');
  }

  // Generate new verification code
  const verificationCode = createVerificationSession(email, 'signup');

  const emailContent = `
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
          
          <h2>Hi ${escapeHtml(user.fullName)}!</h2>
          <p>Here's your new verification code to complete your registration:</p>
          
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
  `;

  // Send email
  const emailSent = await sendEmail({
    to: email,
    subject: 'Verify Your MediRemind Account',
    html: emailContent,
  });

  if (emailSent) {
    console.log(`✅ Resent signup verification email to ${email}`);
  }

  // Only print codes locally; in production they must only travel by email
  if (process.env.NODE_ENV === 'development') {
    console.log('========================================');
    console.log(`🔄 Resend - Verification Code for ${email} (signup)`);
    console.log(`Code: ${verificationCode}`);
    console.log('========================================');
  }

  // In development the code is also printed above, so a failed email doesn't block local testing
  if (!emailSent && process.env.NODE_ENV !== 'development') {
    return apiError(
      'email_failed',
      "We couldn't send the verification email. Please try again in a moment.",
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Verification code resent successfully',
      ...(process.env.NODE_ENV === 'development' && { debug_code: verificationCode }),
    },
    { status: 200 },
  );
});
