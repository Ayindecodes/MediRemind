// lib/adherence.ts
// Streaks and adherence, worked out from doses and their states (lib/schedule/status.ts). Nothing
// is stored: both come straight from the records, so a corrected record corrects them too.
import type { DoseWithState } from './schedule/status';
import type { LocalDate } from './schedule/time-zone';

// All that matters about a dose here, so a route's Dose fits as well as a DoseWithState
export type DoseOutcome = Pick<DoseWithState, 'date' | 'state' | 'scheduled'>;

export interface AdherenceCounts {
  // Doses that were due in the period, pending ones included
  scheduled: number;
  // Taken before the grace period ended
  taken: number;
  takenLate: number;
  skipped: number;
  missed: number;
  // Upcoming or due: not settled yet
  pending: number;
  // Of the settled doses, the whole percentage taken (on time or late); null until one settles
  rate: number | null;
}

/**
 * How the scheduled doses went. Recorded doses the schedule doesn't have (as-needed ones) aren't
 * counted: there was nothing to adhere to.
 */
export function adherenceOf(doses: DoseOutcome[]): AdherenceCounts {
  const counts = { scheduled: 0, taken: 0, takenLate: 0, skipped: 0, missed: 0, pending: 0 };
  for (const dose of doses) {
    if (!dose.scheduled) continue;
    counts.scheduled++;
    switch (dose.state) {
      case 'taken':
        counts.taken++;
        break;
      case 'taken_late':
        counts.takenLate++;
        break;
      case 'skipped':
        counts.skipped++;
        break;
      case 'missed':
        counts.missed++;
        break;
      default:
        counts.pending++;
    }
  }
  const settled = counts.scheduled - counts.pending;
  const rate =
    settled === 0 ? null : Math.round((100 * (counts.taken + counts.takenLate)) / settled);
  return { ...counts, rate };
}

export interface Streaks {
  // Days in a row up to today (or yesterday, if nothing has been taken yet today)
  current: number;
  // The most ever
  longest: number;
}

// How a day went: every settled dose taken, one missed or skipped, or nothing settled yet
type Day = 'perfect' | 'broken' | 'open';

function dayOutcomes(doses: DoseOutcome[], today: LocalDate): Day[] {
  const days = new Map<LocalDate, Day>();
  for (const dose of doses) {
    if (!dose.scheduled || dose.date > today) continue;
    const sofar = days.get(dose.date) ?? 'open';
    if (sofar === 'broken') continue;
    if (dose.state === 'missed' || dose.state === 'skipped') days.set(dose.date, 'broken');
    else if (dose.state === 'taken' || dose.state === 'taken_late') days.set(dose.date, 'perfect');
    else if (sofar === 'open') days.set(dose.date, 'open');
  }
  return [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, day]) => day);
}

/**
 * Days in a row on which every settled dose was taken, on time or late. A day with nothing due is
 * passed over: it neither adds to a streak nor ends one. A missed or skipped dose ends it. Today
 * counts once a dose has been taken and none missed; until then the current streak is yesterday's.
 */
export function streaksOf(doses: DoseOutcome[], today: LocalDate): Streaks {
  const days = dayOutcomes(doses, today);

  let longest = 0;
  let run = 0;
  for (const day of days) {
    if (day === 'broken') run = 0;
    else if (day === 'perfect') longest = Math.max(longest, ++run);
  }

  let current = 0;
  for (const day of days.toReversed()) {
    if (day === 'broken') break;
    if (day === 'perfect') current++;
  }

  return { current, longest };
}
