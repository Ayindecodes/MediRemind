// lib/api/medicines.ts
// What the medicines and dose routes share: the person's time zone, finding their medicine, the
// dates to store, and the shape medicines are returned in.
import { z } from 'zod';
import type { Db } from '@/lib/db/client';
import { getMedication, type MedicationChanges, type MedicationRow } from '@/lib/db/medications';
import { getProfile } from '@/lib/db/profiles';
import { nextDose } from '@/lib/schedule/doses';
import { endDateToStore, medicineStatus, timetableOf } from '@/lib/schedule/medicines';
import type { Schedule } from '@/lib/schedule/schema';
import type { LocalDate } from '@/lib/schedule/time-zone';
import type { Medicine } from '@/lib/types';
import type { MedicineChanges } from '@/lib/validation/medicines';
import { ApiException } from './errors';

// Dates and dose times are the person's own, in their profile's time zone
export async function timeZoneOf(db: Db, userId: string): Promise<string> {
  const profile = await getProfile(db, userId);
  if (!profile) throw new ApiException('not_found', 'Your profile could not be found.');
  return profile.timezone;
}

const medicineId = z.uuid();

// The person's medicine, or a 404 (someone else's medicine looks like it doesn't exist)
export async function findMedicine(db: Db, id: string): Promise<MedicationRow> {
  const medicine = medicineId.safeParse(id).success ? await getMedication(db, id) : null;
  if (!medicine) throw new ApiException('not_found', 'That medicine could not be found.');
  return medicine;
}

/**
 * The end date to save with a schedule and start date, or a 400 if it's before the start. A course
 * ends with its last dose.
 */
export function endDateFor(
  schedule: Schedule | undefined,
  startDate: LocalDate,
  endDate: LocalDate | null | undefined,
  timeZone: string,
): LocalDate | null {
  const end = schedule ? endDateToStore(schedule, startDate, endDate, timeZone) : (endDate ?? null);
  if (end && end < startDate) {
    throw new ApiException('invalid_request', "The end date can't be before the start date.");
  }
  return end;
}

// The table's columns for the fields given; fields left out stay as they are
export function toColumns(medicine: MedicineChanges): MedicationChanges {
  return {
    name: medicine.name,
    strength: medicine.strength,
    form: medicine.form,
    dose_amount: medicine.doseAmount,
    dose_unit: medicine.doseUnit,
    schedule: medicine.schedule,
    start_date: medicine.startDate,
    end_date: medicine.endDate,
    instructions: medicine.instructions,
    notes: medicine.notes,
    appearance: medicine.appearance,
    nafdac_number: medicine.nafdacNumber,
    quantity_remaining: medicine.quantityRemaining,
    refill_alert_days: medicine.refillAlertDays,
    reminder_channels: medicine.reminderChannels,
  };
}

export function toMedicine(row: MedicationRow, timeZone: string, now: Date): Medicine {
  const status = medicineStatus(row, timeZone, now);
  const timetable = timetableOf(row);
  const next =
    timetable && (status === 'active' || status === 'not_started')
      ? nextDose(timetable, timeZone, now)
      : null;

  // The table's rules allow only the values these types list; its generated types just say text
  return {
    id: row.id,
    name: row.name,
    strength: row.strength,
    form: row.form as Medicine['form'],
    doseAmount: row.dose_amount,
    doseUnit: row.dose_unit as Medicine['doseUnit'],
    schedule: (timetable?.schedule ?? row.schedule) as Schedule,
    startDate: row.start_date,
    endDate: row.end_date,
    instructions: row.instructions,
    notes: row.notes,
    appearance: row.appearance as Medicine['appearance'],
    nafdacNumber: row.nafdac_number,
    quantityRemaining: row.quantity_remaining,
    refillAlertDays: row.refill_alert_days,
    reminderChannels: row.reminder_channels as Medicine['reminderChannels'],
    status,
    nextDose: next && { scheduledFor: next.at, date: next.date, time: next.time },
    pausedAt: row.paused_at && new Date(row.paused_at).toISOString(),
    archivedAt: row.archived_at && new Date(row.archived_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
