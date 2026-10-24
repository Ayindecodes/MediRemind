// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { getUserNotifications } from '@/lib/userStorage';
import { withUser } from '@/lib/api/withUser';

export const GET = withUser(async (_request, user) =>
  NextResponse.json({ notifications: getUserNotifications(user.id, 10) }),
);
