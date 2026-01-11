import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { tempUsers } from '@/lib/tempUsers';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase();
    const userData = tempUsers.get(emailKey);

    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'No pending verification found for this email' },
        { status: 404 }
      );
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    tempUsers.set(emailKey, {
      ...userData,
      verificationCode: newCode,
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    try {
      await resend.emails.send({
        from: 'MediRemind <onboarding@resend.dev>',
        to: email,
        subject: 'New Verification Code - MediRemind',
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
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">💊</div>
                  <div class="brand">MediRemind</div>
                </div>
                
                <h2>Hi ${userData.fullName}!</h2>
                <p>You requested a new verification code. Here it is:</p>
                
                <div class="code-box">
                  <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">Your new verification code is:</p>
                  <div class="code">${newCode}</div>
                  <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 14px;">This code will expire in 15 minutes</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error('Email resend failed:', emailError);
    }

    console.log(`🔄 New code sent to ${email}: ${newCode}`);

    return NextResponse.json({
      success: true,
      message: 'New verification code sent',
      ...(process.env.NODE_ENV === 'development' && { debug_code: newCode })
    });

  } catch (error) {
    console.error('Resend error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
