// app/api/medications/check-completions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createNotification, MEDICATIONS_FILE } from '@/lib/userStorage';
import type { Medication } from '@/lib/types';
import { getCronSecret } from '@/lib/env';
import { apiError, handleErrors } from '@/lib/api/errors';
import { withUser } from '@/lib/api/withUser';
import fs from 'fs';
import { timingSafeEqual } from 'crypto';

// Constant-time check of `Authorization: Bearer <CRON_SECRET>`
function isCronRequest(request: NextRequest) {
  const received = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${getCronSecret()}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// Marks the signed-in user's finished courses as completed
export const POST = withUser(async (_request, user) => {
  // Nothing to check until the first medication has been saved
  if (!fs.existsSync(MEDICATIONS_FILE)) {
    return NextResponse.json({ success: true, completedCount: 0, completedMedications: [] });
  }

  // Load medications
  const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
  const medications = new Map(Object.entries(JSON.parse(data)) as [string, Medication][]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedMeds: Medication[] = [];
  let hasChanges = false;

  // Check each user's medication
  medications.forEach((med, key) => {
    if (med.userId === user.id && med.endDate && !med.completed) {
      const endDate = new Date(med.endDate);
      endDate.setHours(23, 59, 59, 999); // End of the end date

      // Check if end date has passed
      if (today > endDate) {
        // Mark as completed
        med.completed = true;
        med.completedAt = new Date().toISOString();
        medications.set(key, med);
        completedMeds.push(med);
        hasChanges = true;

        console.log(`✅ Medication "${med.name}" automatically marked as completed`);
      }
    }
  });

  // Save changes if any
  if (hasChanges) {
    fs.writeFileSync(MEDICATIONS_FILE, JSON.stringify(Object.fromEntries(medications), null, 2));

    // Create notifications for completed medications
    completedMeds.forEach((med) => {
      createNotification(user.id, {
        type: 'streak',
        message: `🎉 Congratulations! You've completed your "${med.name}" treatment course.`,
        actionUrl: '/dashboard/medications',
      });
    });
  }

  return NextResponse.json({
    success: true,
    completedCount: completedMeds.length,
    completedMedications: completedMeds.map((m) => m.name),
  });
});

// For a scheduler: checks every user's medications, so it requires CRON_SECRET
export const GET = handleErrors(async (request: NextRequest) => {
  if (!isCronRequest(request)) {
    return apiError('unauthorized', 'This endpoint needs the scheduler key (CRON_SECRET).');
  }

  // Nothing to check until the first medication has been saved
  if (!fs.existsSync(MEDICATIONS_FILE)) {
    return NextResponse.json({
      success: true,
      completedCount: 0,
      message: 'No medications to check',
    });
  }

  const medications = JSON.parse(fs.readFileSync(MEDICATIONS_FILE, 'utf-8'));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let completedCount = 0;

  Object.keys(medications).forEach((key) => {
    const med = medications[key];
    if (med.endDate && !med.completed) {
      const endDate = new Date(med.endDate);
      endDate.setHours(23, 59, 59, 999);

      if (today > endDate) {
        medications[key].completed = true;
        medications[key].completedAt = new Date().toISOString();
        completedCount++;

        // Create notification
        if (med.userId) {
          createNotification(med.userId, {
            type: 'streak',
            message: `🎉 Congratulations! You've completed your "${med.name}" treatment course.`,
            actionUrl: '/dashboard/medications',
          });
        }
      }
    }
  });

  if (completedCount > 0) {
    fs.writeFileSync(MEDICATIONS_FILE, JSON.stringify(medications, null, 2));
  }

  return NextResponse.json({
    success: true,
    completedCount,
    message: `Checked and marked ${completedCount} medications as completed`,
  });
});
