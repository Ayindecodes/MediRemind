import { NextRequest, NextResponse } from 'next/server';
import { getUserStreak, getUserByEmail } from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';
import type { StreakSummary } from '@/lib/types';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
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

    const streak = getUserStreak(user.id);

    const summary: StreakSummary = {
      currentStreak: streak.current,
      longestStreak: streak.longest,
      totalMedsTaken: streak.totalMedsTaken,
      weeklyAdherence: streak.weeklyAdherence,
    };
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Streak error:', error);
    return NextResponse.json({ error: 'Failed to get streak' }, { status: 500 });
  }
}
