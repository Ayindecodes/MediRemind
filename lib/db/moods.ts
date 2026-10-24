// lib/db/moods.ts
import type { MoodValue } from '@/lib/types';
import type { Db } from './client';
import type { Tables } from './database.types';
import { unwrap } from './errors';

export type MoodRow = Tables<'moods'>;

// A day's check-in, or null. `day` is the date in the person's time zone, as YYYY-MM-DD.
export async function getMood(db: Db, userId: string, day: string): Promise<MoodRow | null> {
  return unwrap(
    await db.from('moods').select('*').eq('user_id', userId).eq('logged_on', day).maybeSingle(),
  );
}

/**
 * Logs a day's mood. Choosing again on the same day replaces it (an insert, then an update when the
 * day already has one: people may only change the mood and note of a check-in).
 */
export async function logMood(
  db: Db,
  userId: string,
  { day, mood, note }: { day: string; mood: MoodValue; note?: string },
): Promise<MoodRow> {
  const changes = { mood, note: note ?? null };
  const inserted = await db
    .from('moods')
    .insert({ ...changes, user_id: userId, logged_on: day })
    .select()
    .single();
  if (inserted.error?.code === '23505') {
    return unwrap(
      await db
        .from('moods')
        .update(changes)
        .eq('user_id', userId)
        .eq('logged_on', day)
        .select()
        .single(),
    );
  }
  return unwrap(inserted);
}
