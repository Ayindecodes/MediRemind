// lib/db/client.ts
// The two ways server code reaches the database.
//
// - dbForUser(accessToken) acts as the signed-in person, so the database's access rules decide what
//   they can read and change. Use it for everything people do themselves.
// - dbAsServer() uses the secret key: full access, bypassing the access rules. Use it only for what
//   people may not do themselves, such as creating profiles, recording payments and sending reminders.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, getSupabaseSecretKey } from '@/lib/env';
import type { Database } from './database.types';

export type Db = SupabaseClient<Database>;

// Server code doesn't keep sessions: every request brings its own token
const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

export function dbForUser(accessToken: string): Db {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient<Database>(url, publishableKey, {
    auth,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function dbAsServer(): Db {
  const { url } = getSupabaseConfig();
  return createClient<Database>(url, getSupabaseSecretKey(), { auth });
}
