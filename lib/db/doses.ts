// lib/db/doses.ts
import type { Db } from './client';
import type { Tables } from './database.types';
import { unwrap } from './errors';

export type DoseLogRow = Tables<'dose_logs'>;

// A dose as people record it. Missed doses, and doses confirmed by a WhatsApp or SMS reply or by a
// caregiver, are recorded by the server.
export interface DoseRecord {
  medicationId: string;
  // When the dose was due, as an ISO timestamp
  scheduledFor: string;
  status: 'taken' | 'skipped';
  // When it was taken; defaults to now
  takenAt?: string;
  skipReason?: string;
  // 'push' when recorded from a notification's button
  source?: 'app' | 'push';
}

// Someone's dose records due from `from` up to (not including) `to`, in time order
export async function listDoses(
  db: Db,
  userId: string,
  { from, to }: { from: string; to: string },
): Promise<DoseLogRow[]> {
  return unwrap(
    await db
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_for', from)
      .lt('scheduled_for', to)
      .order('scheduled_for'),
  );
}

// What was recorded for one dose, or null if nothing was
export async function getDose(
  db: Db,
  { medicationId, scheduledFor }: Pick<DoseRecord, 'medicationId' | 'scheduledFor'>,
): Promise<DoseLogRow | null> {
  return unwrap(
    await db
      .from('dose_logs')
      .select('*')
      .eq('medication_id', medicationId)
      .eq('scheduled_for', scheduledFor)
      .maybeSingle(),
  );
}

/**
 * Records what happened to a dose. Recording the same dose again (same medicine, same due time)
 * replaces the earlier record, so a double tap or a retried request counts once.
 */
export async function recordDose(db: Db, userId: string, dose: DoseRecord): Promise<DoseLogRow> {
  const taken = dose.status === 'taken';
  const record = {
    status: dose.status,
    taken_at: taken ? (dose.takenAt ?? new Date().toISOString()) : null,
    skip_reason: taken ? null : (dose.skipReason ?? null),
    source: dose.source ?? 'app',
  };

  const inserted = await db
    .from('dose_logs')
    .insert({
      ...record,
      user_id: userId,
      medication_id: dose.medicationId,
      scheduled_for: dose.scheduledFor,
    })
    .select()
    .single();
  // Already recorded: replace it. People may only change these four columns of a dose record,
  // which is why this isn't a single upsert (that would also rewrite the key columns).
  if (inserted.error?.code === '23505') {
    return unwrap(
      await db
        .from('dose_logs')
        .update(record)
        .eq('medication_id', dose.medicationId)
        .eq('scheduled_for', dose.scheduledFor)
        .select()
        .single(),
    );
  }
  return unwrap(inserted);
}

// Removes a dose record; returns whether there was one to remove
export async function undoDose(
  db: Db,
  { medicationId, scheduledFor }: Pick<DoseRecord, 'medicationId' | 'scheduledFor'>,
): Promise<boolean> {
  const removed = unwrap(
    await db
      .from('dose_logs')
      .delete()
      .eq('medication_id', medicationId)
      .eq('scheduled_for', scheduledFor)
      .select('id'),
  );
  return removed.length > 0;
}
