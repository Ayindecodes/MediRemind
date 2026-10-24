// app/api/medications/list/route.ts
import { NextResponse } from 'next/server';
import { getUserMedications } from '@/lib/userStorage';
import { withUser } from '@/lib/api/withUser';

export const GET = withUser(async (_request, user) =>
  NextResponse.json({ medications: getUserMedications(user.id) }),
);
