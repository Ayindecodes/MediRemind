import { NextRequest, NextResponse } from 'next/server';
import { markMedicationAsTaken, getUserByEmail } from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { email: string };
    const user = getUserByEmail(decoded.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { medicationId } = await request.json();

    // Extract scheduled time from medicationId
    const parts = medicationId.split('_');
    const scheduledTime = parts[parts.length - 1];
    const actualMedId = parts.slice(2, -2).join('_');

    markMedicationAsTaken(user.id, actualMedId, scheduledTime);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Mark taken error:', error);
    return NextResponse.json({ error: 'Failed to mark medication' }, { status: 500 });
  }
}
