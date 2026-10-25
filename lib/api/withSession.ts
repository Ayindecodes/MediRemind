// lib/api/withSession.ts
// The login check for routes that use Supabase sessions (cookies). It replaces withUser once the old
// sign-in is gone (Task 42).
import type { User } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';
import { sessionFor } from '@/lib/auth/session';
import type { Db } from '@/lib/db/client';
import { apiError, handleErrors } from './errors';

export interface SignedIn {
  user: User;
  // The database as this person, so the access rules apply
  db: Db;
}

/**
 * Wraps a handler that needs a signed-in person. Requests without a valid session get a 401. Any
 * refreshed session is written back to the response's cookies.
 */
export function withSession<Context = unknown>(
  handler: (request: NextRequest, session: SignedIn, context: Context) => Promise<NextResponse>,
) {
  return handleErrors(async (request: NextRequest, context?: Context) => {
    const { db, respond } = sessionFor(request);
    // Asks Auth rather than trusting the cookie, so a signed-out session is refused even before its
    // token expires
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) {
      return respond(apiError('unauthorized', 'Please log in to continue.'));
    }
    return respond(await handler(request, { user: data.user, db }, context as Context));
  });
}
