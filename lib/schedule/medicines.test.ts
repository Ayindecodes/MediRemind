import { describe, expect, it, vi } from 'vitest';
import { isDoseOf, medicineDoses, timetableOf, type StoredMedicine } from './medicines';

const LAGOS = 'Africa/Lagos';

const medicine = (changes: Partial<StoredMedicine> = {}): StoredMedicine => ({
  id: '3f1c2a9e-5b7d-4c8e-9a1f-2b3c4d5e6f70',
  schedule: { type: 'daily', times: ['20:00', '08:00'] },
  start_date: '2026-10-01',
  end_date: null,
  paused_at: null,
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
