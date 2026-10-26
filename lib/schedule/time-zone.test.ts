import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isoWeekday, localDate, localTime, zonedInstant } from './time-zone';

const iso = (instant: number) => new Date(instant).toISOString();
const LAGOS = 'Africa/Lagos';
const LONDON = 'Europe/London';

describe('zonedInstant', () => {
  it('places a Lagos time an hour ahead of UTC, all year round', () => {
    expect(iso(zonedInstant('2026-10-24', '08:00', LAGOS))).toBe('2026-10-24T07:00:00.000Z');
    expect(iso(zonedInstant('2026-01-15', '08:00', LAGOS))).toBe('2026-01-15T07:00:00.000Z');
    expect(iso(zonedInstant('2026-10-24', '00:30', LAGOS))).toBe('2026-10-23T23:30:00.000Z');
  });

  it('follows summer time elsewhere', () => {
    expect(iso(zonedInstant('2026-07-01', '08:00', LONDON))).toBe('2026-07-01T07:00:00.000Z');
    expect(iso(zonedInstant('2026-12-01', '08:00', LONDON))).toBe('2026-12-01T08:00:00.000Z');
  });

  it('moves a time skipped when the clocks go forward on by the change', () => {
    // London skips 01:00–02:00 on 29 March 2026
    const skipped = zonedInstant('2026-03-29', '01:30', LONDON);
    expect(iso(skipped)).toBe('2026-03-29T01:30:00.000Z');
    expect(localTime(skipped, LONDON)).toBe('02:30');
  });

  it('takes the first of a time that happens twice when the clocks go back', () => {
    // London has 01:00–02:00 twice on 25 October 2026: first in summer time, then in winter time
    expect(iso(zonedInstant('2026-10-25', '01:30', LONDON))).toBe('2026-10-25T00:30:00.000Z');
  });
});

describe('localDate and localTime', () => {
  it("give the person's own date, which in Lagos turns over at 23:00 UTC", () => {
    const lateEvening = Date.parse('2026-10-24T23:30:00Z');
    expect(localDate(lateEvening, LAGOS)).toBe('2026-10-25');
    expect(localTime(lateEvening, LAGOS)).toBe('00:30');
    expect(localDate(lateEvening, 'UTC')).toBe('2026-10-24');
  });
});

describe('calendar arithmetic', () => {
  it('adds days across months, years and leap days', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-10-26', '2026-10-24')).toBe(-2);
    // Not thrown off by clock changes
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('names weekdays Monday 1 to Sunday 7', () => {
    expect(isoWeekday('2026-10-26')).toBe(1);
    expect(isoWeekday('2026-10-24')).toBe(6);
    expect(isoWeekday('2026-10-25')).toBe(7);
  });
});
