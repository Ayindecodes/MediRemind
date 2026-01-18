import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createNotification } from '@/lib/userStorage';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MEDICATIONS_FILE = path.join(process.cwd(), 'data', 'medications.json');

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

    // Load medications
    const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
    const medications = new Map(Object.entries(JSON.parse(data)));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedMeds: any[] = [];
    let hasChanges = false;

    // Check each user's medication
    medications.forEach((med: any, key) => {
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
      completedMeds.forEach(med => {
        createNotification(user.id, {
          type: 'streak',
          message: `🎉 Congratulations! You've completed your "${med.name}" treatment course.`,
          actionUrl: '/dashboard/medications'
        });
      });
    }

    return NextResponse.json({
      success: true,
      completedCount: completedMeds.length,
      completedMedications: completedMeds.map(m => m.name)
    });
  } catch (error) {
    console.error('Check completions error:', error);
    return NextResponse.json({ error: 'Failed to check completions' }, { status: 500 });
  }
}

// Also create a GET endpoint for cron jobs or scheduled checks
export async function GET(request: NextRequest) {
  try {
    // This can be called by a cron job without auth
    const medications = JSON.parse(fs.readFileSync(MEDICATIONS_FILE, 'utf-8'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let completedCount = 0;

    Object.keys(medications).forEach(key => {
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
              actionUrl: '/dashboard/medications'
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
      message: `Checked and marked ${completedCount} medications as completed`
    });
  } catch (error) {
    console.error('Auto-check completions error:', error);
    return NextResponse.json({ error: 'Failed to auto-check' }, { status: 500 });
  }
}