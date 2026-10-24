// lib/db/profiles.ts
import type { Db } from './client';
import type { Tables, TablesUpdate } from './database.types';
import { unwrap } from './errors';

export type ProfileRow = Tables<'profiles'>;

// What people may change about themselves; phone, email and plan change through the server
export type ProfileChanges = Pick<TablesUpdate<'profiles'>, 'full_name' | 'timezone' | 'language'>;

// A profile, or null when there isn't one the caller may see
export async function getProfile(db: Db, userId: string): Promise<ProfileRow | null> {
  return unwrap(await db.from('profiles').select('*').eq('id', userId).maybeSingle());
}

export async function updateProfile(
  db: Db,
  userId: string,
  changes: ProfileChanges,
): Promise<ProfileRow> {
  return unwrap(await db.from('profiles').update(changes).eq('id', userId).select().single());
}
