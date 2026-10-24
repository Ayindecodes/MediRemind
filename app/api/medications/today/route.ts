// app/api/medications/today/route.ts
import { NextResponse } from 'next/server';
import { getTodaysMedications } from '@/lib/userStorage';
import { withUser } from '@/lib/api/withUser';

export const GET = withUser(async (_request, user) =>
  NextResponse.json({ medications: getTodaysMedications(user.id) }),
);
