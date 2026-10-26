// lib/schedule/status.ts
// What state each dose is in: worked out from when it was due, what was recorded and the time now.
// Only what people did (or a missed dose) is stored; upcoming and due are never saved.
import type { ScheduledDose } from './doses';
import { localDate, localTime } from './time-zone';

export type DoseState = 'upcoming' | 'due' | 'missed' | 'taken' | 'taken_late' | 'skipped';

// How long after its time a dose counts as missed, unless the person sets their own
// (notification_prefs.grace_minutes has the same default)
export const DEFAULT_GRACE_MINUTES = 60;

// What was recorded for a dose: a row of dose_logs, or the parts of one that matter here
export interface DoseRecord {
  scheduled_for: string;
  status: 'taken' | 'skipped' | 'missed';
  taken_at: string | null;
  skip_reason?: string | null;
}

/**
 * A dose's state at `now`:
 * - upcoming before its time, due from its time until the grace period ends, missed after that;
 * - taken if taken before the grace period ended (early counts), taken late if after;
 * - skipped if the person chose to skip it, missed if the system recorded it missed.
 */
export function doseState(
  dueAt: string,
  record: Pick<DoseRecord, 'status' | 'taken_at'> | null | undefined,
  now: Date,
  graceMinutes = DEFAULT_GRACE_MINUTES,
): DoseState {
  const missedFrom = Date.parse(dueAt) + graceMinutes * 60_000;

  if (record?.status === 'taken') {
    return record.taken_at && Date.parse(record.taken_at) >= missedFrom ? 'taken_late' : 'taken';
  }
  if (record?.status === 'skipped') return 'skipped';
  if (record?.status === 'missed') return 'missed';

  if (now.getTime() < Date.parse(dueAt)) return 'upcoming';
  return now.getTime() < missedFrom ? 'due' : 'missed';
}

export interface DoseWithState extends ScheduledDose {
  state: DoseState;
  takenAt: string | null;
  skipReason: string | null;
  // False for a recorded dose the schedule doesn't have: an as-needed dose, or one recorded before
  // the schedule changed
  scheduled: boolean;
}

/**
 * Puts each scheduled dose together with what was recorded for it, matching them by the moment
 * they were due (however the timestamp is written). Recorded doses the schedule doesn't have are
 * kept too, so as-needed doses show up. In time order.
 */
export function withStates(
  doses: ScheduledDose[],
  records: DoseRecord[],
  timeZone: string,
  now: Date,
  graceMinutes = DEFAULT_GRACE_MINUTES,
): DoseWithState[] {
  const recorded = new Map(records.map((record) => [Date.parse(record.scheduled_for), record]));

  const scheduled = doses.map((dose): DoseWithState => {
    const instant = Date.parse(dose.at);
    const record = recorded.get(instant);
    recorded.delete(instant);
    return {
      ...dose,
      state: doseState(dose.at, record, now, graceMinutes),
      takenAt: record?.taken_at ?? null,
      skipReason: record?.skip_reason ?? null,
      scheduled: true,
    };
  });

  const unscheduled = [...recorded.entries()].map(([instant, record]): DoseWithState => ({
    at: new Date(instant).toISOString(),
    date: localDate(instant, timeZone),
    time: localTime(instant, timeZone),
    state: doseState(record.scheduled_for, record, now, graceMinutes),
    takenAt: record.taken_at,
    skipReason: record.skip_reason ?? null,
    scheduled: false,
  }));

  return [...scheduled, ...unscheduled].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
