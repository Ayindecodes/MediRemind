// app/api/user/streak/route.ts
import { NextResponse } from 'next/server';
import { getUserStreak } from '@/lib/userStorage';
import type { StreakSummary } from '@/lib/types';
import { withUser } from '@/lib/api/withUser';

export const GET = withUser(async (_request, user) => {
  const streak = getUserStreak(user.id);
  const summary: StreakSummary = {
    currentStreak: streak.current,
    longestStreak: streak.longest,
    totalMedsTaken: streak.totalMedsTaken,
    weeklyAdherence: streak.weeklyAdherence,
  };
  return NextResponse.json(summary);
});
