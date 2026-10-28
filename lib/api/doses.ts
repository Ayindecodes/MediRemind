// lib/api/doses.ts
// What the dose routes share: the person's time zone and grace period, finding the medicine, and
// the shape doses are returned in.
import type { Db } from '@/lib/db/client';
import type { DoseLogRow } from '@/lib/db/doses';
import { getMedication, type MedicationRow } from '@/lib/db/medications';
import { getProfile } from '@/lib/db/profiles';
import { getGraceMinutes } from '@/lib/db/reminder-preferences';
import { isDoseOf, medicineDoses, timetableOf } from '@/lib/schedule/medicines';
import { withStates, type DoseRecord, type DoseWithState } from '@/lib/schedule/status';
import type { Dose } from '@/lib/types';
import { ApiException } from './errors';

export interface DoseSettings {
  timeZone: string;
  graceMinutes: number;
}

export async function doseSettings(db: Db, userId: string): Promise<DoseSettings> {
  const [profile, graceMinutes] = await Promise.all([
    getProfile(db, userId),
    getGraceMinutes(db, userId),
  ]);
  if (!profile) throw new ApiException('not_found', 'Your profile could not be found.');
  return { timeZone: profile.timezone, graceMinutes };
}

// The person's medicine, or a 404 (someone else's medicine looks like it doesn't exist)
export async function findMedicine(db: Db, id: string): Promise<MedicationRow> {
  const medicine = await getMedication(db, id);
  if (!medicine) throw new ApiException('not_found', 'That medicine could not be found.');
  return medicine;
}

const DAY = 86_400_000;

// A phone whose clock is a few minutes fast can still record a dose as taken now
export const CLOCK_ALLOWANCE = 5 * 60_000;

export function isAsNeeded(medicine: MedicationRow): boolean {
  return timetableOf(medicine)?.schedule.type === 'as_needed';
}

// Archived medicines are hidden and have no reminders, so their doses aren't recorded
export function checkNotArchived(medicine: MedicationRow) {
  if (medicine.archived_at) {
    throw new ApiException(
      'invalid_request',
      'This medicine is archived. Restore it to record its doses.',
    );
  }
}

// A dose taken or skipped must be one of the medicine's, and not due more than a day from now
export function checkScheduledDose(
  medicine: MedicationRow,
  scheduledFor: string,
  { timeZone }: DoseSettings,
  now: Date,
) {
  if (!isDoseOf(medicine, scheduledFor, timeZone)) {
    throw new ApiException('invalid_request', "That isn't one of this medicine's doses.");
  }
  if (Date.parse(scheduledFor) > now.getTime() + DAY) {
    throw new ApiException(
      'invalid_request',
      "That dose isn't due for more than a day, so it can't be recorded yet.",
    );
  }
}

function toDose(medicine: MedicationRow, dose: DoseWithState): Dose {
  return {
    medication: {
      id: medicine.id,
      name: medicine.name,
      strength: medicine.strength,
      form: medicine.form,
      doseAmount: medicine.dose_amount,
      doseUnit: medicine.dose_unit,
      instructions: medicine.instructions,
    },
    scheduledFor: dose.at,
    date: dose.date,
    time: dose.time,
    state: dose.state,
    // As an ISO timestamp, like scheduledFor (the database writes +00:00)
    takenAt: dose.takenAt && new Date(dose.takenAt).toISOString(),
    skipReason: dose.skipReason,
    scheduled: dose.scheduled,
  };
}

/**
 * A medicine's doses due from `from` up to (not including) `to`, each with its state at `now`: the
 * scheduled ones, plus any recorded ones the schedule doesn't have. `records` are the medicine's
 * dose records in the same range.
 */
export function dosesOf(
  medicine: MedicationRow,
  records: DoseLogRow[],
  { timeZone, graceMinutes }: DoseSettings,
  { from, to, now }: { from: Date; to: Date; now: Date },
): Dose[] {
  const scheduled = medicineDoses(medicine, timeZone, from, to);
  // The table only allows these statuses; its generated type just says text
  const recorded = records as (DoseLogRow & Pick<DoseRecord, 'status'>)[];
  return withStates(scheduled, recorded, timeZone, now, graceMinutes).map((dose) =>
    toDose(medicine, dose),
  );
}

// One dose of a medicine as it is now, or null if it's neither scheduled nor recorded
export function doseAt(
  medicine: MedicationRow,
  scheduledFor: string,
  record: DoseLogRow | null,
  settings: DoseSettings,
  now: Date,
): Dose | null {
  const from = new Date(scheduledFor);
  const to = new Date(from.getTime() + 1);
  return dosesOf(medicine, record ? [record] : [], settings, { from, to, now })[0] ?? null;
}
