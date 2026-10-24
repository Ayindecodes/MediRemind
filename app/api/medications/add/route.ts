// app/api/medications/add/route.ts
import { NextResponse } from 'next/server';
import { addMedication, getUserMedications } from '@/lib/userStorage';
import { getAppUrl } from '@/lib/env';
import { escapeHtml, sendEmail } from '@/lib/email';
import { apiError } from '@/lib/api/errors';
import { withUser } from '@/lib/api/withUser';
import { newMedicationSchema } from '@/lib/validation/medication';
import { parseJsonBody } from '@/lib/validation/request';

export const POST = withUser(async (request, user) => {
  // Only the fields in the schema are kept, so the request can't set the owner or ID
  const input = await parseJsonBody(request, newMedicationSchema);
  if (!input.ok) {
    return apiError('invalid_request', input.error);
  }
  const medData = input.data;

  // Check plan limits
  const existingMeds = getUserMedications(user.id);

  if (user.plan === 'free' && existingMeds.length >= 3) {
    return apiError(
      'upgrade_required',
      'Free plan is limited to 3 medications. Please upgrade to add more.',
    );
  }

  // Free plan cannot upload photos
  if (user.plan === 'free' && medData.photoUrl) {
    return apiError(
      'upgrade_required',
      'Photo uploads are only available on Premium and Family plans.',
    );
  }

  // Create medication
  const medication = addMedication(user.id, { ...medData, reminders: true });

  // Send confirmation email if enabled
  let emailSent = false;
  if (medData.enableEmail) {
    try {
      emailSent = await sendEmail({
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
                  
                  <h2>Hi ${escapeHtml(user.fullName)}!</h2>
                  <p>You've successfully added a new medication to your schedule:</p>

                  <div class="med-card">
                    <h3 style="margin-top: 0; color: #111827;">${escapeHtml(medData.icon)} ${escapeHtml(medData.name)}</h3>
                    <p style="margin: 8px 0;"><strong>Dosage:</strong> ${escapeHtml(medData.dosage)}</p>
                    <p style="margin: 8px 0;"><strong>Frequency:</strong> ${escapeHtml(medData.frequency).replace(/_/g, ' ')}</p>
                    ${
                      medData.times && medData.times.length > 0
                        ? `
                      <p style="margin: 8px 0;"><strong>Reminder Times:</strong></p>
                      <div>
                        ${medData.times.map((time: string) => `<span class="time-badge">${escapeHtml(time)}</span>`).join('')}
                      </div>
                    `
                        : ''
                    }
                    ${medData.notes ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #6B7280;"><strong>Notes:</strong> ${escapeHtml(medData.notes)}</p>` : ''}
                  </div>
                  
                  <p>We'll send you reminders ${medData.enableSound ? 'with sound notifications ' : ''}to help you stay on track!</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${getAppUrl()}/dashboard" 
                       style="display: inline-block; background: linear-gradient(to right, #4F46E5, #7C3AED); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                      View in Dashboard
                    </a>
                  </div>
                  
                  <div class="footer">
                    <p>© 2025 MediRemind. All rights reserved.</p>
                    <p style="font-size: 12px; margin-top: 8px;">
                      <a href="${getAppUrl()}/dashboard/settings" style="color: #4F46E5;">Manage notification preferences</a>
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
      });

      if (emailSent) {
        console.log(`✅ Medication confirmation email sent to ${user.email}`);
      }
    } catch (emailError) {
      console.error('Building the confirmation email failed:', emailError);
      // Don't fail the request if email fails
    }
  }

  console.log(`✅ Medication added: ${medication.name} for user ${user.email}`);

  return NextResponse.json(
    {
      success: true,
      message: 'Medication added successfully!',
      medication,
      emailSent,
    },
    { status: 201 },
  );
});
