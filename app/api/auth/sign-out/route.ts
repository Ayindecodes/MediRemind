// app/api/auth/sign-out/route.ts
// Ends this device's session and clears its cookies. (Signing out everywhere comes with Settings.)
import { NextResponse, type NextRequest } from 'next/server';
import { handleErrors } from '@/lib/api/errors';
import { sessionFor } from '@/lib/auth/session';

export const POST = handleErrors(async (request: NextRequest) => {
  const { db, respond } = sessionFor(request);
  // Already signed out is fine too
  await db.auth.signOut({ scope: 'local' });
  return respond(NextResponse.json({ signedOut: true }));
});
