// app/api/user/profile/route.ts
import { NextResponse } from 'next/server';
import type { Profile } from '@/lib/types';
import { withUser } from '@/lib/api/withUser';

export const GET = withUser(async (_request, user) => {
  const profile: Profile = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    plan: user.plan,
    planExpiry: user.planExpiry,
    verified: user.verified,
  };
  return NextResponse.json(profile);
});
