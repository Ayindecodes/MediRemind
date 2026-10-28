// lib/schedule/medicines.ts
// The doses of a medicine as the medications table stores it: its schedule, dates and pause.
import type { Tables } from '@/lib/db/database.types';
import { dosesBetween, type ScheduledDose, type Timetable } from './doses';
import { scheduleSchema } from './schema';

export type StoredMedicine = Pick<
  Tables<'medications'>,
  'id' | 'schedule' | 'start_date' | 'end_date' | 'paused_at'
>;

// The medicine's schedule and dates, or null if the stored schedule isn't one this code knows
export function timetableOf(medicine: StoredMedicine): Timetable | null {
  const schedule = scheduleSchema.safeParse(medicine.schedule);
  if (!schedule.success) return null;
  return { schedule: schedule.data, startDate: medicine.start_date, endDate: medicine.end_date };
}

/**
 * The medicine's doses due from `from` up to (not including) `to`. None from the moment it was
 * paused. A stored schedule that can't be read gives none and is logged, so that one bad row can't
 * stop someone's other medicines from showing.
 */
export function medicineDoses(
  medicine: StoredMedicine,
  timeZone: string,
  from: Date,
  to: Date,
): ScheduledDose[] {
  const timetable = timetableOf(medicine);
  if (!timetable) {
    console.error(`Medicine ${medicine.id} has a schedule that can't be read:`, medicine.schedule);
    return [];
  }
  const until = medicine.paused_at ? Math.min(to.getTime(), Date.parse(medicine.paused_at)) : to;
  return dosesBetween(timetable, timeZone, from, new Date(until));
}

// Whether one of the medicine's doses is due at exactly this moment
export function isDoseOf(medicine: StoredMedicine, at: string, timeZone: string): boolean {
  const instant = Date.parse(at);
  return medicineDoses(medicine, timeZone, new Date(instant), new Date(instant + 1)).length > 0;
}
