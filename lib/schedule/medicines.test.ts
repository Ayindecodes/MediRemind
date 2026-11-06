import { describe, expect, it, vi } from 'vitest';
import {
  endDateToStore,
  isDoseOf,
  medicineDoses,
  medicineStatus,
  timetableOf,
  type StoredMedicine,
} from './medicines';
import { scheduleSchema } from './schema';

const LAGOS = 'Africa/Lagos';

const medicine = (changes: Partial<StoredMedicine> = {}): StoredMedicine => ({
  id: '3f1c2a9e-5b7d-4c8e-9a1f-2b3c4d5e6f70',
  schedule: { type: 'daily', times: ['20:00', '08:00'] },
  start_date: '2026-10-01',
  end_date: null,
  paused_at: null,
  archived_at: null,
  ...changes,
});

// The Lagos clock times of the doses on 20 October
const onThe20th = (stored: StoredMedicine) =>
  medicineDoses(
    stored,
    LAGOS,
    new Date('2026-10-20T00:00:00+01:00'),
    new Date('2026-10-21T00:00:00+01:00'),
  ).map((dose) => dose.time);

describe('timetableOf', () => {
  it('reads the stored schedule and dates', () => {
    expect(timetableOf(medicine({ end_date: '2026-12-31' }))).toEqual({
      schedule: { type: 'daily', times: ['08:00', '20:00'] },
      startDate: '2026-10-01',
      endDate: '2026-12-31',
    });
  });

  it("gives null for a schedule this code doesn't know", () => {
    expect(timetableOf(medicine({ schedule: { type: 'daily', times: ['8am'] } }))).toBeNull();
  });
});

describe('medicineDoses', () => {
  it("gives the day's doses", () => {
    expect(onThe20th(medicine())).toEqual(['08:00', '20:00']);
  });

  it('gives none from the moment the medicine was paused', () => {
    expect(onThe20th(medicine({ paused_at: '2026-10-20T12:00:00+01:00' }))).toEqual(['08:00']);
    expect(onThe20th(medicine({ paused_at: '2026-10-19T12:00:00+01:00' }))).toEqual([]);
  });

  it("gives none for a schedule that can't be read, and logs it", () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(onThe20th(medicine({ schedule: { type: 'monthly' } }))).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('3f1c2a9e'), { type: 'monthly' });
  });
});

describe('isDoseOf', () => {
  it('is true only at the exact moment a dose is due', () => {
    expect(isDoseOf(medicine(), '2026-10-20T07:00:00.000Z', LAGOS)).toBe(true);
    expect(isDoseOf(medicine(), '2026-10-20T07:00:01.000Z', LAGOS)).toBe(false);
    expect(isDoseOf(medicine(), '2026-10-20T08:00:00.000Z', LAGOS)).toBe(false);
  });

  it("follows the person's time zone", () => {
    expect(isDoseOf(medicine(), '2026-10-20T07:00:00.000Z', 'Europe/London')).toBe(true);
    expect(isDoseOf(medicine(), '2026-10-20T07:00:00.000Z', 'America/New_York')).toBe(false);
  });

  it('is false before the start date and after the end date', () => {
    expect(isDoseOf(medicine(), '2026-09-30T07:00:00.000Z', LAGOS)).toBe(false);
    expect(isDoseOf(medicine({ end_date: '2026-10-19' }), '2026-10-20T07:00:00.000Z', LAGOS)).toBe(
      false,
    );
  });

  it('is never true for an as-needed medicine', () => {
    expect(
      isDoseOf(medicine({ schedule: { type: 'as_needed' } }), '2026-10-20T07:00:00Z', LAGOS),
    ).toBe(false);
  });
});

describe('medicineStatus', () => {
  // Noon in Lagos on 20 October
  const now = new Date('2026-10-20T12:00:00+01:00');
  const status = (changes: Partial<StoredMedicine>) =>
    medicineStatus(medicine(changes), LAGOS, now);
  const course = { type: 'course', firstDose: '08:00', offsetsHours: [0, 8, 24, 36, 48, 60] };

  it('is active from its start date until its last dose day is over', () => {
    expect(status({})).toBe('active');
    expect(status({ start_date: '2026-10-20' })).toBe('active');
    expect(status({ end_date: '2026-10-20' })).toBe('active');
    expect(status({ end_date: '2026-10-19' })).toBe('finished');
    expect(status({ start_date: '2026-10-21' })).toBe('not_started');
  });

  it('ends a course with its last dose, even without an end date', () => {
    // From 08:00 on the 17th, the last dose is at 20:00 on the 19th
    expect(status({ schedule: course, start_date: '2026-10-17' })).toBe('finished');
    expect(status({ schedule: course, start_date: '2026-10-18' })).toBe('active');
  });

  it('puts archived before paused, and both before the dates', () => {
    const over = { end_date: '2026-10-01', start_date: '2026-09-01' };
    expect(status({ ...over, paused_at: '2026-10-05T00:00:00Z' })).toBe('paused');
    expect(
      status({ ...over, paused_at: '2026-10-05T00:00:00Z', archived_at: '2026-10-06T00:00:00Z' }),
    ).toBe('archived');
  });

  it("uses the person's own date", () => {
    // 23:30 on the 19th in Lagos is already the 20th in Nairobi
    const lateEvening = new Date('2026-10-19T23:30:00+01:00');
    const ending = medicine({ end_date: '2026-10-19' });
    expect(medicineStatus(ending, LAGOS, lateEvening)).toBe('active');
    expect(medicineStatus(ending, 'Africa/Nairobi', lateEvening)).toBe('finished');
  });
});

describe('endDateToStore', () => {
  const daily = scheduleSchema.parse({ type: 'daily', times: ['08:00'] });
  const course = scheduleSchema.parse({
    type: 'course',
    firstDose: '08:00',
    offsetsHours: [0, 8, 24, 36, 48, 60],
  });

  it('keeps the end date given, or none', () => {
    expect(endDateToStore(daily, '2026-10-01', '2026-10-31', LAGOS)).toBe('2026-10-31');
    expect(endDateToStore(daily, '2026-10-01', undefined, LAGOS)).toBeNull();
  });

  it("ends a course on its last dose's date, or earlier if asked", () => {
    expect(endDateToStore(course, '2026-10-20', undefined, LAGOS)).toBe('2026-10-22');
    expect(endDateToStore(course, '2026-10-20', '2026-12-31', LAGOS)).toBe('2026-10-22');
    expect(endDateToStore(course, '2026-10-20', '2026-10-21', LAGOS)).toBe('2026-10-21');
  });
});
