// lib/schedule/doses.ts
// Turns a medicine's schedule into the times its doses are due, in the person's own time zone.
import type { Schedule } from './schema';
import {
  addDays,
  daysBetween,
  isoWeekday,
  localDate,
  localTime,
  zonedInstant,
  type LocalDate,
  type LocalTime,
} from './time-zone';

// A medicine's schedule and the dates it runs between (endDate inclusive; null for ongoing)
export interface Timetable {
  schedule: Schedule;
  startDate: LocalDate;
  endDate?: LocalDate | null;
}

export interface ScheduledDose {
  // When it's due, as an ISO timestamp: what dose_logs.scheduled_for stores
  at: string;
  // The person's own date and clock time for it
  date: LocalDate;
  time: LocalTime;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Whether a schedule that repeats on chosen days has doses on a date
function hasDosesOn(schedule: Schedule, startDate: LocalDate, date: LocalDate): boolean {
  switch (schedule.type) {
    case 'daily':
      return true;
    case 'every_n_days':
      return daysBetween(startDate, date) % schedule.everyDays === 0;
    case 'weekdays':
      return schedule.days.includes(isoWeekday(date));
    default:
      return false;
  }
}

// The instants a schedule's doses fall on within [from, to), before the dates are applied
function candidateInstants(
  { schedule, startDate, endDate }: Timetable,
  timeZone: string,
  from: number,
  to: number,
): number[] {
  switch (schedule.type) {
    case 'as_needed':
      return [];

    case 'every_n_hours': {
      const first = zonedInstant(startDate, schedule.firstDose, timeZone);
      const step = schedule.everyHours * HOUR;
      const instants: number[] = [];
      for (let k = Math.max(0, Math.ceil((from - first) / step)); first + k * step < to; k++) {
        instants.push(first + k * step);
      }
      return instants;
    }

    case 'course': {
      const first = zonedInstant(startDate, schedule.firstDose, timeZone);
      return schedule.offsetsHours.map((hours) => first + Math.round(hours * 60) * MINUTE);
    }

    default: {
      // Only the local dates the range covers, within the medicine's own dates
      let day = localDate(from, timeZone);
      if (day < startDate) day = startDate;
      let lastDay = localDate(to - 1, timeZone);
      if (endDate && lastDay > endDate) lastDay = endDate;

      const instants: number[] = [];
      for (; day <= lastDay; day = addDays(day, 1)) {
        if (!hasDosesOn(schedule, startDate, day)) continue;
        for (const time of schedule.times) instants.push(zonedInstant(day, time, timeZone));
      }
      return instants;
    }
  }
}

/**
 * Every dose due from `from` up to (not including) `to`, in time order. Never before the start date
 * or after the end date, in the person's time zone. As-needed medicines have none.
 */
export function dosesBetween(
  timetable: Timetable,
  timeZone: string,
  from: Date,
  to: Date,
): ScheduledDose[] {
  const start = from.getTime();
  const stop = to.getTime();
  if (stop <= start) return [];

  return candidateInstants(timetable, timeZone, start, stop)
    .filter((at) => at >= start && at < stop)
    .map((at) => ({ at, date: localDate(at, timeZone) }))
    .filter(
      ({ date }) =>
        date >= timetable.startDate && (!timetable.endDate || date <= timetable.endDate),
    )
    .sort((a, b) => a.at - b.at)
    .map(({ at, date }) => ({
      at: new Date(at).toISOString(),
      date,
      time: localTime(at, timeZone),
    }));
}

// How far ahead to look for a next dose: more than the longest gap a schedule allows (a course runs
// up to 90 days)
const LOOKAHEAD = 100 * DAY;

// The first dose due at or after `after`, or null if there are no more
export function nextDose(
  timetable: Timetable,
  timeZone: string,
  after: Date,
): ScheduledDose | null {
  const from = Math.max(after.getTime(), zonedInstant(timetable.startDate, '00:00', timeZone));
  return dosesBetween(timetable, timeZone, new Date(from), new Date(from + LOOKAHEAD))[0] ?? null;
}

/**
 * The date of the last dose, for schedules that end: a course ends with its last dose, anything else
 * on its end date. Null for an ongoing medicine.
 */
export function lastDoseDate(timetable: Timetable, timeZone: string): LocalDate | null {
  const { schedule, startDate, endDate } = timetable;
  if (schedule.type === 'course') {
    const first = zonedInstant(startDate, schedule.firstDose, timeZone);
    const last = localDate(
      first + Math.round(schedule.offsetsHours.at(-1)! * 60) * MINUTE,
      timeZone,
    );
    return endDate && endDate < last ? endDate : last;
  }
  return endDate ?? null;
}
