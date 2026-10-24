// app/api/therapy/upcoming-session/route.ts
import { NextResponse } from 'next/server';
import { getUpcomingSession } from '@/lib/userStorage';
import { withUser } from '@/lib/api/withUser';

export const GET = withUser(async (_request, user) =>
  NextResponse.json({ session: getUpcomingSession(user.id) }),
);
