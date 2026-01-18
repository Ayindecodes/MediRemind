import { NextRequest, NextResponse } from 'next/server';
import { markMedicationAsTaken, getUserByEmail } from '@/lib/userStorage';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

    const { medicationId, takenAt } = await request.json();
    
    // Extract scheduled time from medicationId
    const parts = medicationId.split('_');
    const scheduledTime = parts[parts.length - 1];
    const actualMedId = parts.slice(2, -2).join('_');

    const result = markMedicationAsTaken(user.id, actualMedId, scheduledTime);

    return NextResponse.json({
  success: true
});

  } catch (error) {
    console.error('Mark taken error:', error);
    return NextResponse.json({ error: 'Failed to mark medication' }, { status: 500 });
  }
}