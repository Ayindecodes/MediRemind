import { NextRequest, NextResponse } from 'next/server';
import { getTodayMood, getUserByEmail } from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';
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

    const mood = getTodayMood(user.id);

    return NextResponse.json({ mood: mood?.mood || null });
  } catch (error) {
    console.error('Mood error:', error);
    return NextResponse.json({ error: 'Failed to get mood' }, { status: 500 });
  }
}