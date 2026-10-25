// lib/schedule/time-zone.ts
// Local dates and times in a person's time zone, turned into instants and back, using only Intl.
// Doses are scheduled in each person's own zone (Africa/Lagos by default), not in UTC.

// 'YYYY-MM-DD' and 'HH:MM', as the person's clock and calendar show them
export type LocalDate = string;
export type LocalTime = string;

const DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatters.set(timeZone, format);
  }
  return format;
}

// What a clock in the time zone reads at an instant, as if that reading were UTC
function wallClock(instant: number, timeZone: string): number {
  const parts: Record<string, number> = {};
  for (const { type, value } of formatter(timeZone).formatToParts(new Date(instant))) {
    parts[type] = Number(value);
  }
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

// How far the zone's clocks are ahead of UTC at an instant (whole minutes)
function offsetAt(instant: number, timeZone: string): number {
  return wallClock(instant, timeZone) - Math.floor(instant / 60_000) * 60_000;
}

/**
 * The instant a local date and time happens in a time zone. Where a clock change skips the time
 * (springing forward), it moves forward by the change. Where it happens twice (falling back), it's
 * the first of the two.
 */
export function zonedInstant(date: LocalDate, time: LocalTime, timeZone: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const reading = Date.UTC(year, month - 1, day, hour, minute);

  // The zone's offset a day either side covers any clock change in between
  const before = reading - offsetAt(reading - DAY, timeZone);
  const after = reading - offsetAt(reading + DAY, timeZone);
  const real = [before, after].filter((instant) => wallClock(instant, timeZone) === reading);
  return real.length > 0 ? Math.min(...real) : before;
}

export function localDate(instant: number, timeZone: string): LocalDate {
  return new Date(wallClock(instant, timeZone)).toISOString().slice(0, 10);
}

export function localTime(instant: number, timeZone: string): LocalTime {
  return new Date(wallClock(instant, timeZone)).toISOString().slice(11, 16);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Whole days from one date to another (negative if `to` is earlier)
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

// 1 = Monday … 7 = Sunday
export function isoWeekday(date: LocalDate): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}
