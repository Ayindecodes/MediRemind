// lib/db/medications.ts
import type { Db } from './client';
import type { Tables, TablesInsert, TablesUpdate } from './database.types';
import { unwrap } from './errors';

export type MedicationRow = Tables<'medications'>;

// What people set when adding a medicine. The owner comes from the session; the photo and the
// paused flag are the server's (see the access rules in docs/database.md).
export type NewMedication = Pick<
  TablesInsert<'medications'>,
  | 'name'
  | 'strength'
  | 'form'
  | 'dose_amount'
  | 'dose_unit'
  | 'schedule'
  | 'start_date'
  | 'end_date'
  | 'instructions'
  | 'notes'
  | 'appearance'
  | 'nafdac_number'
  | 'quantity_remaining'
  | 'refill_alert_days'
  | 'reminder_channels'
>;

// What people may change; archiving has its own functions
export type MedicationChanges = Pick<TablesUpdate<'medications'>, keyof NewMedication>;

/**
 * Someone's medicines, oldest first. Archived ones are left out unless asked for. Finished courses
 * are included: whether a medicine is current depends on today's date in the person's time zone.
 */
export async function listMedications(
  db: Db,
  userId: string,
  { archived = false }: { archived?: boolean } = {},
): Promise<MedicationRow[]> {
  let query = db.from('medications').select('*').eq('user_id', userId);
  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
  return unwrap(await query.order('created_at'));
}

// A medicine, or null when there isn't one the caller may see
export async function getMedication(db: Db, id: string): Promise<MedicationRow | null> {
  return unwrap(await db.from('medications').select('*').eq('id', id).maybeSingle());
}

// Throws DbError 'upgrade_required' when the free plan already has 3 active medicines
export async function addMedication(
  db: Db,
  userId: string,
  medicine: NewMedication,
): Promise<MedicationRow> {
  return unwrap(
    await db
      .from('medications')
      .insert({ ...medicine, user_id: userId })
      .select()
      .single(),
  );
}

export async function updateMedication(
  db: Db,
  id: string,
  changes: MedicationChanges,
): Promise<MedicationRow> {
  return unwrap(await db.from('medications').update(changes).eq('id', id).select().single());
}

// Archiving hides a medicine and stops its reminders; it can be undone with restoreMedication()
export async function archiveMedication(db: Db, id: string): Promise<MedicationRow> {
  return unwrap(
    await db
      .from('medications')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
  );
}

// Throws DbError 'upgrade_required' if restoring it would go over the free plan's limit
export async function restoreMedication(db: Db, id: string): Promise<MedicationRow> {
  return unwrap(
    await db.from('medications').update({ archived_at: null }).eq('id', id).select().single(),
  );
}
