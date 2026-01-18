// app/api/medications/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addMedication, getUserByEmail, getUserMedications } from '@/lib/userStorage';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const user = getUserByEmail(decoded.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const medData = await request.json();

    // Check plan limits
    const existingMeds = getUserMedications(user.id);
    
    if (user.plan === 'free' && existingMeds.length >= 3) {
      return NextResponse.json({ 
        error: 'Free plan is limited to 3 medications. Please upgrade to add more.',
        upgradeRequired: true 
      }, { status: 403 });
    }

    // Free plan cannot upload photos
    if (user.plan === 'free' && medData.photoUrl) {
      return NextResponse.json({ 
        error: 'Photo uploads are only available on Premium and Family plans.',
        upgradeRequired: true 
      }, { status: 403 });
    }

    // Create medication
    const medication = addMedication(user.id, {
      name: medData.name,
      dosage: medData.dosage,
      frequency: medData.frequency,
      times: medData.times || [],
      startDate: medData.startDate,
      endDate: medData.endDate,
      color: medData.color || 'from-blue-500 to-cyan-500',
      icon: medData.icon || '💊',
      reminders: true,
      photoUrl: medData.photoUrl,
      form: medData.form,
      notes: medData.notes,
      enableSound: medData.enableSound,
      enableEmail: medData.enableEmail,
      soundType: medData.soundType,
      refillReminder: medData.refillReminder ? {
        enabled: true,
        daysLeft: parseInt(medData.refillReminder)
      } : undefined
    });

    // Send confirmation email if enabled
    if (medData.enableEmail) {
      try {
        await resend.emails.send({
          from: 'MediRemind <onboarding@resend.dev>',
          to: user.email,
          subject: `New Medication Added: ${medData.name}`,
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
                  .med-card { background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #4F46E5; }
                  .time-badge { display: inline-block; background: #EEF2FF; color: #4F46E5; padding: 4px 12px; border-radius: 12px; font-size: 14px; margin: 4px; }
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
                  <p>You've successfully added a new medication to your schedule:</p>
                  
                  <div class="med-card">
                    <h3 style="margin-top: 0; color: #111827;">${medData.icon} ${medData.name}</h3>
                    <p style="margin: 8px 0;"><strong>Dosage:</strong> ${medData.dosage}</p>
                    <p style="margin: 8px 0;"><strong>Frequency:</strong> ${medData.frequency.replace(/_/g, ' ')}</p>
                    ${medData.times && medData.times.length > 0 ? `
                      <p style="margin: 8px 0;"><strong>Reminder Times:</strong></p>
                      <div>
                        ${medData.times.map((time: string) => `<span class="time-badge">${time}</span>`).join('')}
                      </div>
                    ` : ''}
                    ${medData.notes ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #6B7280;"><strong>Notes:</strong> ${medData.notes}</p>` : ''}
                  </div>
                  
                  <p>We'll send you reminders ${medData.enableSound ? 'with sound notifications ' : ''}to help you stay on track!</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
                       style="display: inline-block; background: linear-gradient(to right, #4F46E5, #7C3AED); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                      View in Dashboard
                    </a>
                  </div>
                  
                  <div class="footer">
                    <p>© 2025 MediRemind. All rights reserved.</p>
                    <p style="font-size: 12px; margin-top: 8px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings" style="color: #4F46E5;">Manage notification preferences</a>
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        console.log(`✅ Medication confirmation email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails
      }
    }

    console.log(`✅ Medication added: ${medication.name} for user ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Medication added successfully!',
      medication
    }, { status: 201 });

  } catch (error: any) {
    console.error('Add medication error:', error);
    
    if (error.message === 'Email already registered') {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to add medication. Please try again.' 
    }, { status: 500 });
  }
}