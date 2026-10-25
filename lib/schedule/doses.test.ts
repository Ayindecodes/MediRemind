import { describe, expect, it } from 'vitest';
import { dosesBetween, lastDoseDate, nextDose, type Timetable } from './doses';
import { PRESETS, scheduleSchema } from './schema';

const LAGOS = 'Africa/Lagos';
const LONDON = 'Europe/London';

const timetable = (schedule: unknown, startDate: string, endDate?: string): Timetable => ({
  schedule: scheduleSchema.parse(schedule),
  startDate,
  endDate,
});

// Doses as the person sees them: "date time"
const seen = (table: Timetable, from: string, to: string, timeZone = LAGOS) =>
  dosesBetween(table, timeZone, new Date(from), new Date(to)).map((d) => `${d.date} ${d.time}`);

describe('daily schedules', () => {
  const twiceDaily = timetable({ type: 'daily', times: PRESETS.bd, preset: 'bd' }, '2026-10-24');

  it('give each time of day, as instants and as the person sees them', () => {
    expect(
      dosesBetween(
        twiceDaily,
        LAGOS,
        new Date('2026-10-24T00:00:00+01:00'),
        new Date('2026-10-25T00:00:00+01:00'),
      ),
    ).toEqual([
      { at: '2026-10-24T07:00:00.000Z', date: '2026-10-24', time: '08:00' },
      { at: '2026-10-24T19:00:00.000Z', date: '2026-10-24', time: '20:00' },
    ]);
  });

  it('include the start of the range but not its end', () => {
    expect(seen(twiceDaily, '2026-10-24T07:00:00Z', '2026-10-24T19:00:00Z')).toEqual([
      '2026-10-24 08:00',
    ]);
  });

  it("put a dose on the person's own date, not the UTC one", () => {
    // 00:30 in Lagos on the 25th is still the 24th in UTC
    const lateNight = timetable({ type: 'daily', times: ['00:30'] }, '2026-10-24');
    expect(
      dosesBetween(
        lateNight,
        LAGOS,
        new Date('2026-10-24T23:00:00Z'),
        new Date('2026-10-25T00:00:00Z'),
      ),
    ).toEqual([{ at: '2026-10-24T23:30:00.000Z', date: '2026-10-25', time: '00:30' }]);
  });

  it('start on the start date and stop after the end date', () => {
    const course = timetable({ type: 'daily', times: PRESETS.od }, '2026-10-24', '2026-10-26');
    expect(seen(course, '2026-10-20T00:00:00Z', '2026-10-31T00:00:00Z')).toEqual([
      '2026-10-24 08:00',
      '2026-10-25 08:00',
      '2026-10-26 08:00',
    ]);
  });

  it('keep to the clock through a clock change', () => {
    // London's clocks go back on 25 October 2026: 08:00 is 07:00 UTC before, 08:00 UTC after
    const daily = timetable({ type: 'daily', times: ['08:00'] }, '2026-10-24');
    expect(
      dosesBetween(
        daily,
        LONDON,
        new Date('2026-10-24T00:00:00Z'),
        new Date('2026-10-27T00:00:00Z'),
      ).map((d) => d.at),
    ).toEqual(['2026-10-24T07:00:00.000Z', '2026-10-25T08:00:00.000Z', '2026-10-26T08:00:00.000Z']);
  });
});

describe('every N hours', () => {
  const everyEight = timetable(
    { type: 'every_n_hours', everyHours: 8, firstDose: '06:00' },
    '2026-10-24',
  );

  it('counts from the first dose', () => {
    expect(seen(everyEight, '2026-10-24T00:00:00Z', '2026-10-25T12:00:00Z')).toEqual([
      '2026-10-24 06:00',
      '2026-10-24 14:00',
      '2026-10-24 22:00',
      '2026-10-25 06:00',
    ]);
  });

  it('picks up the count part-way through', () => {
    expect(seen(everyEight, '2026-11-30T00:00:00Z', '2026-11-30T23:00:00Z')).toEqual([
      '2026-11-30 06:00',
      '2026-11-30 14:00',
      '2026-11-30 22:00',
    ]);
  });

  it('stops after the end date', () => {
    const antibiotic = timetable(
      { type: 'every_n_hours', everyHours: 12, firstDose: '07:00' },
      '2026-10-24',
      '2026-10-25',
    );
    expect(seen(antibiotic, '2026-10-01T00:00:00Z', '2026-11-30T00:00:00Z')).toEqual([
      '2026-10-24 07:00',
      '2026-10-24 19:00',
      '2026-10-25 07:00',
      '2026-10-25 19:00',
    ]);
  });

  it('keeps the gap in real hours through a clock change, so the clock times move', () => {
    const everyTwelve = timetable(
      { type: 'every_n_hours', everyHours: 12, firstDose: '09:00' },
      '2026-10-24',
    );
    expect(seen(everyTwelve, '2026-10-24T00:00:00Z', '2026-10-26T00:00:00Z', LONDON)).toEqual([
      '2026-10-24 09:00',
      '2026-10-24 21:00',
      '2026-10-25 08:00',
      '2026-10-25 20:00',
    ]);
  });
});

describe('every N days and chosen weekdays', () => {
  it('counts every other day from the start date', () => {
    const everyOther = timetable(
      { type: 'every_n_days', everyDays: 2, times: ['08:00'] },
      '2026-10-24',
    );
    expect(seen(everyOther, '2026-10-24T00:00:00Z', '2026-10-31T00:00:00Z')).toEqual([
      '2026-10-24 08:00',
      '2026-10-26 08:00',
      '2026-10-28 08:00',
      '2026-10-30 08:00',
    ]);
  });

  it('gives doses only on the chosen days of the week', () => {
    // Monday, Wednesday and Friday; 26 October 2026 is a Monday
    const mwf = timetable({ type: 'weekdays', days: [1, 3, 5], times: ['09:00'] }, '2026-10-24');
    expect(seen(mwf, '2026-10-24T00:00:00Z', '2026-11-02T00:00:00Z')).toEqual([
      '2026-10-26 09:00',
      '2026-10-28 09:00',
      '2026-10-30 09:00',
    ]);
  });

  it('gives a weekly dose on its one day', () => {
    const weekly = timetable({ type: 'weekdays', days: [7], times: ['10:00'] }, '2026-10-01');
    expect(seen(weekly, '2026-10-01T00:00:00Z', '2026-10-31T00:00:00Z')).toEqual([
      '2026-10-04 10:00',
      '2026-10-11 10:00',
      '2026-10-18 10:00',
      '2026-10-25 10:00',
    ]);
  });
});

describe('courses', () => {
  // Artemether-lumefantrine (Coartem): doses at 0, 8, 24, 36, 48 and 60 hours
  const coartem = timetable(
    { type: 'course', firstDose: '08:00', offsetsHours: [0, 8, 24, 36, 48, 60] },
    '2026-10-24',
  );

  it('gives the malaria course its six doses at the right hours', () => {
    expect(seen(coartem, '2026-10-01T00:00:00Z', '2026-11-30T00:00:00Z')).toEqual([
      '2026-10-24 08:00',
      '2026-10-24 16:00',
      '2026-10-25 08:00',
      '2026-10-25 20:00',
      '2026-10-26 08:00',
      '2026-10-26 20:00',
    ]);
  });

  it('ends with its last dose', () => {
    expect(lastDoseDate(coartem, LAGOS)).toBe('2026-10-26');
    expect(nextDose(coartem, LAGOS, new Date('2026-10-26T20:00:00Z'))).toBeNull();
  });

  it('stops early if the medicine is ended early', () => {
    const stopped = { ...coartem, endDate: '2026-10-24' };
    expect(seen(stopped, '2026-10-01T00:00:00Z', '2026-11-30T00:00:00Z')).toEqual([
      '2026-10-24 08:00',
      '2026-10-24 16:00',
    ]);
    expect(lastDoseDate(stopped, LAGOS)).toBe('2026-10-24');
  });
});

describe('as-needed medicines', () => {
  it('have no scheduled doses', () => {
    const asNeeded = timetable({ type: 'as_needed' }, '2026-10-24');
    expect(seen(asNeeded, '2026-10-24T00:00:00Z', '2026-12-24T00:00:00Z')).toEqual([]);
    expect(nextDose(asNeeded, LAGOS, new Date('2026-10-24T00:00:00Z'))).toBeNull();
  });
});

describe('nextDose', () => {
  const twiceDaily = timetable({ type: 'daily', times: PRESETS.bd }, '2026-10-24', '2026-10-31');

  it("is tomorrow morning's dose once tonight's has passed", () => {
    expect(nextDose(twiceDaily, LAGOS, new Date('2026-10-25T20:30:00+01:00'))).toEqual({
      at: '2026-10-26T07:00:00.000Z',
      date: '2026-10-26',
      time: '08:00',
    });
  });

  it('counts a dose due right now', () => {
    expect(nextDose(twiceDaily, LAGOS, new Date('2026-10-25T20:00:00+01:00'))?.time).toBe('20:00');
  });

  it('is the first dose for a medicine that has not started', () => {
    expect(nextDose(twiceDaily, LAGOS, new Date('2026-09-01T00:00:00Z'))?.date).toBe('2026-10-24');
  });

  it('is null once the medicine has ended', () => {
    expect(nextDose(twiceDaily, LAGOS, new Date('2026-11-01T00:00:00Z'))).toBeNull();
  });

  it('finds a weekly dose days away', () => {
    const weekly = timetable({ type: 'weekdays', days: [7], times: ['10:00'] }, '2026-10-01');
    expect(nextDose(weekly, LAGOS, new Date('2026-10-26T00:00:00Z'))?.date).toBe('2026-11-01');
  });
});

describe('lastDoseDate', () => {
  it('is the end date, or null for an ongoing medicine', () => {
    expect(
      lastDoseDate(
        timetable({ type: 'daily', times: ['08:00'] }, '2026-10-24', '2026-11-24'),
        LAGOS,
      ),
    ).toBe('2026-11-24');
    expect(
      lastDoseDate(timetable({ type: 'daily', times: ['08:00'] }, '2026-10-24'), LAGOS),
    ).toBeNull();
  });
});
