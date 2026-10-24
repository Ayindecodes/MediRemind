// app/api/mood/today/route.ts
import { NextResponse } from 'next/server';
import { getTodayMood } from '@/lib/userStorage';
import { withUser } from '@/lib/api/withUser';

export const GET = withUser(async (_request, user) =>
  NextResponse.json({ mood: getTodayMood(user.id)?.mood ?? null }),
);
