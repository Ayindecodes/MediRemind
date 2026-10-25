// app/api/auth/me/route.ts
// The signed-in person's profile
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api/errors';
import { withSession } from '@/lib/api/withSession';
import { getProfile } from '@/lib/db/profiles';

export const GET = withSession(async (_request, { user, db }) => {
  const profile = await getProfile(db, user.id);
  if (!profile) return apiError('not_found', 'Your profile could not be found.');
  return NextResponse.json({ profile });
});
