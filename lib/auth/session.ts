// lib/auth/session.ts
// Supabase sessions for route handlers, kept in cookies that the page's JavaScript can't read.
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Db } from '@/lib/db/client';
import type { Database } from '@/lib/db/database.types';
import { getSupabaseConfig } from '@/lib/env';

// httpOnly: scripts on the page can't read the session. secure: HTTPS only in production. lax: not
// sent on requests other sites start, which could otherwise act on someone's behalf.
export const SESSION_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;

type CookieToSet = { name: string; value: string; options: Record<string, unknown> };

export interface Session {
  // The database as whoever the request's cookies say is signed in (or as nobody)
  db: Db;
  // Copies any change to the session (signing in, a refreshed token, signing out) onto the response
  respond: <T extends NextResponse>(response: T) => T;
}

export function sessionFor(request: NextRequest): Session {
  const { url, publishableKey } = getSupabaseConfig();
  const changes: CookieToSet[] = [];

  const db = createServerClient<Database>(url, publishableKey, {
    cookieOptions: SESSION_COOKIE,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        changes.push(...cookies);
        // Later reads in the same request see the new session
        for (const { name, value } of cookies) request.cookies.set(name, value);
      },
    },
  });

  return {
    db,
    respond: (response) => {
      for (const { name, value, options } of changes) {
        response.cookies.set(name, value, { ...options, ...SESSION_COOKIE });
      }
      return response;
    },
  };
}
