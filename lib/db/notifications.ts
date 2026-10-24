// lib/db/notifications.ts
import type { Db } from './client';
import type { Tables, TablesInsert } from './database.types';
import { unwrap } from './errors';

export type NotificationRow = Tables<'notifications'>;

// Someone's notifications, newest first
export async function listNotifications(
  db: Db,
  userId: string,
  { limit = 20 }: { limit?: number } = {},
): Promise<NotificationRow[]> {
  return unwrap(
    await db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  );
}

// Marks the given notifications, or all unread ones, as read; returns how many changed
export async function markNotificationsRead(
  db: Db,
  userId: string,
  ids?: string[],
): Promise<number> {
  let query = db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (ids) query = query.in('id', ids);
  return unwrap(await query.select('id')).length;
}

// Deletes the given notifications, or all of them; returns how many were removed
export async function clearNotifications(db: Db, userId: string, ids?: string[]): Promise<number> {
  let query = db.from('notifications').delete().eq('user_id', userId);
  if (ids) query = query.in('id', ids);
  return unwrap(await query.select('id')).length;
}

/**
 * Adds a notification to someone's list. Needs the server's client (dbAsServer): people can't
 * create notifications, so nobody can plant one.
 */
export async function notify(
  server: Db,
  userId: string,
  notification: Pick<TablesInsert<'notifications'>, 'type' | 'message' | 'action_url'>,
): Promise<NotificationRow> {
  return unwrap(
    await server
      .from('notifications')
      .insert({ ...notification, user_id: userId })
      .select()
      .single(),
  );
}
