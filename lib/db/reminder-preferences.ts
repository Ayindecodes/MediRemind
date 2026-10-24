// lib/db/reminder-preferences.ts
import type { Db } from './client';
import type { Tables, TablesUpdate } from './database.types';
import { unwrap } from './errors';

export type ReminderPreferencesRow = Tables<'notification_prefs'>;

// What people may change; the WhatsApp opt-in is recorded by the server (recordWhatsAppOptIn)
export type ReminderPreferenceChanges = Pick<
  TablesUpdate<'notification_prefs'>,
  | 'channels'
  | 'quiet_hours_start'
  | 'quiet_hours_end'
  | 'lead_minutes'
  | 'grace_minutes'
  | 'follow_up_minutes'
  | 'follow_up_channel'
  | 'discreet'
>;

/**
 * Someone's reminder settings. The first time, this saves the table's defaults for them (phone
 * notifications, on time, missed after an hour), so the defaults live only in the database.
 */
export async function getReminderPreferences(
  db: Db,
  userId: string,
): Promise<ReminderPreferencesRow> {
  const saved = unwrap(
    await db.from('notification_prefs').select('*').eq('user_id', userId).maybeSingle(),
  );
  if (saved) return saved;

  const created = await db.from('notification_prefs').insert({ user_id: userId }).select().single();
  // Created a moment ago by another request
  if (created.error?.code === '23505') {
    return unwrap(await db.from('notification_prefs').select('*').eq('user_id', userId).single());
  }
  return unwrap(created);
}

/**
 * Saves changes to someone's reminder settings. WhatsApp can't be chosen, as a channel or for
 * follow-ups, until the opt-in is recorded: the database refuses it (invalid_request).
 *
 * Updates first and inserts only when there's nothing to update: an insert is checked against the
 * table's rules before it's found to be a duplicate, and a new row wouldn't carry the saved opt-in.
 */
export async function saveReminderPreferences(
  db: Db,
  userId: string,
  changes: ReminderPreferenceChanges,
): Promise<ReminderPreferencesRow> {
  const update = () => db.from('notification_prefs').update(changes).eq('user_id', userId).select();

  const [updated] = unwrap(await update());
  if (updated) return updated;

  const inserted = await db
    .from('notification_prefs')
    .insert({ ...changes, user_id: userId })
    .select()
    .single();
  // Created a moment ago by another request: update that row instead
  if (inserted.error?.code === '23505') {
    const [row] = unwrap(await update());
    if (row) return row;
  }
  return unwrap(inserted);
}

// Records that someone opted in to WhatsApp messages (Meta's rule). Needs the server's client.
export async function recordWhatsAppOptIn(
  server: Db,
  userId: string,
): Promise<ReminderPreferencesRow> {
  return unwrap(
    await server
      .from('notification_prefs')
      .upsert(
        { user_id: userId, whatsapp_opted_in_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select()
      .single(),
  );
}
