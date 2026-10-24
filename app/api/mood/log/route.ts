import { NextRequest, NextResponse } from 'next/server';
import { logMood, getUserByEmail } from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';
import { moodSchema } from '@/lib/validation/mood';
import { parseJsonBody } from '@/lib/validation/request';
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

    const input = await parseJsonBody(request, moodSchema);
    if (!input.ok) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }
    const { mood, note } = input.data;
    const moodEntry = logMood(user.id, mood, note);

    return NextResponse.json({ success: true, mood: moodEntry });
  } catch (error) {
    console.error('Log mood error:', error);
    return NextResponse.json({ error: 'Failed to log mood' }, { status: 500 });
  }
}
