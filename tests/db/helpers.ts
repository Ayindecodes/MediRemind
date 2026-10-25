// Real people for the data layer's tests: each is created through Supabase Auth, signed in with a
// password, and deleted (with everything they own) by deleteTestUsers().
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { dbAsServer, dbForUser, type Db } from '@/lib/db/client';
import { getSupabaseConfig } from '@/lib/env';

export interface TestUser {
  id: string;
  email: string;
  // The database as this person, with the access rules applied
  db: Db;
}

const created: string[] = [];

export async function createTestUser(
  name: string,
  { plan = 'free' }: { plan?: 'free' | 'premium' | 'family' } = {},
): Promise<TestUser> {
  const server = dbAsServer();
  const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}.${randomUUID().slice(0, 8)}@example.com`;
  const password = randomUUID();

  // Signing up creates the profile, from the name in the user metadata
  const { data, error } = await server.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  const id = data.user.id;
  created.push(id);

  if (plan !== 'free') {
    const { error: planError } = await server
      .from('profiles')
      .update({ plan, plan_expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() })
      .eq('id', id);
    if (planError) throw planError;
  }

  const { url, publishableKey } = getSupabaseConfig();
  const auth = createClient(url, publishableKey, { auth: { persistSession: false } });
  const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  return { id, email, db: dbForUser(signedIn.session.access_token) };
}

// Deletes every test user created so far; their data goes with them
export async function deleteTestUsers() {
  const server = dbAsServer();
  for (const id of created.splice(0)) {
    await server.auth.admin.deleteUser(id);
  }
}
