// app/api/resend-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createVerificationSession, getUserByEmail } from '@/lib/userStorage';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const verificationType: 'signup' | 'login' = type || 'signup';

    // Check if user exists
    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Generate new verification code
    const verificationCode = createVerificationSession(email, verificationType);

    // Prepare email content based on type
    const emailSubject = verificationType === 'signup' 
      ? 'Verify Your MediRemind Account' 
      : 'MediRemind Login Verification Code';

    const emailContent = verificationType === 'signup' ? `
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
            
            <h2>Hi ${user.fullName}!</h2>
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
    ` : `
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
            <p>Here's your new login verification code:</p>
            
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
    `;

    // Send email
    try {
      await resend.emails.send({
        from: 'MediRemind <onboarding@resend.dev>',
        to: email,
        subject: emailSubject,
        html: emailContent,
      });

      console.log(`✅ Resent ${verificationType} verification email to ${email}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    console.log('========================================');
    console.log(`🔄 Resend - Verification Code for ${email} (${verificationType})`);
    console.log(`Code: ${verificationCode}`);
    console.log('========================================');

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully',
      ...(process.env.NODE_ENV === 'development' && { debug_code: verificationCode })
    }, { status: 200 });

  } catch (error) {
    console.error('Resend code error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}