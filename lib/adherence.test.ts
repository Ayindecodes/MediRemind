import { describe, expect, it } from 'vitest';
import { adherenceOf, streaksOf } from './adherence';
import type { DoseState, DoseWithState } from './schedule/status';

// A dose on a day in Lagos, in a state
const dose = (date: string, time: string, state: DoseState, scheduled = true): DoseWithState => ({
  at: new Date(`${date}T${time}:00+01:00`).toISOString(),
  date,
  time,
  state,
  takenAt: state === 'taken' || state === 'taken_late' ? `${date}T${time}:00+01:00` : null,
  skipReason: null,
  scheduled,
});

// A day's doses at 08:00 and 20:00, in these states
const day = (date: string, morning: DoseState, evening: DoseState) => [
  dose(date, '08:00', morning),
  dose(date, '20:00', evening),
];

describe('adherenceOf', () => {
  it('counts each state and the share of settled doses taken', () => {
    const counts = adherenceOf([
      ...day('2026-10-20', 'taken', 'taken_late'),
      ...day('2026-10-21', 'skipped', 'missed'),
      ...day('2026-10-22', 'taken', 'due'),
      dose('2026-10-22', '21:00', 'upcoming'),
    ]);
    expect(counts).toEqual({
      scheduled: 7,
      taken: 2,
      takenLate: 1,
      skipped: 1,
      missed: 1,
      pending: 2,
      rate: 60, // 3 of the 5 settled doses
    });
  });

  it('has no rate until a dose settles', () => {
    expect(adherenceOf(day('2026-10-22', 'upcoming', 'upcoming')).rate).toBeNull();
    expect(adherenceOf([]).rate).toBeNull();
  });

  it("leaves out recorded doses the schedule doesn't have", () => {
    const counts = adherenceOf([dose('2026-10-20', '14:30', 'taken', false)]);
    expect(counts).toEqual({
      scheduled: 0,
      taken: 0,
      takenLate: 0,
      skipped: 0,
      missed: 0,
      pending: 0,
      rate: null,
    });
  });

  it('rounds to a whole percent', () => {
    expect(
      adherenceOf([...day('2026-10-20', 'taken', 'taken'), dose('2026-10-21', '08:00', 'missed')])
        .rate,
    ).toBe(67);
  });
});

describe('streaksOf', () => {
  const TODAY = '2026-10-24';

  it('counts the days in a row on which every dose was taken', () => {
    const streaks = streaksOf(
      [
        ...day('2026-10-20', 'taken', 'taken'),
        ...day('2026-10-21', 'taken', 'missed'),
        ...day('2026-10-22', 'taken', 'taken_late'),
        ...day('2026-10-23', 'taken', 'taken'),
        ...day('2026-10-24', 'taken', 'upcoming'),
      ],
      TODAY,
    );
    expect(streaks).toEqual({ current: 3, longest: 3 });
  });

  it('remembers the longest streak', () => {
    const streaks = streaksOf(
      [
        ...day('2026-10-15', 'taken', 'taken'),
        ...day('2026-10-16', 'taken', 'taken'),
        ...day('2026-10-17', 'taken', 'taken'),
        ...day('2026-10-18', 'taken', 'taken'),
        ...day('2026-10-19', 'skipped', 'taken'),
        ...day('2026-10-20', 'taken', 'taken'),
        ...day('2026-10-21', 'missed', 'missed'),
        ...day('2026-10-22', 'taken', 'taken'),
        ...day('2026-10-23', 'taken', 'taken'),
      ],
      TODAY,
    );
    expect(streaks).toEqual({ current: 2, longest: 4 });
  });

  it("is yesterday's until something is taken today, and 0 once a dose is missed today", () => {
    const perfectYesterday = day('2026-10-23', 'taken', 'taken');
    expect(streaksOf([...perfectYesterday, ...day(TODAY, 'due', 'upcoming')], TODAY)).toEqual({
      current: 1,
      longest: 1,
    });
    expect(streaksOf([...perfectYesterday, ...day(TODAY, 'taken', 'upcoming')], TODAY)).toEqual({
      current: 2,
      longest: 2,
    });
    expect(streaksOf([...perfectYesterday, ...day(TODAY, 'missed', 'upcoming')], TODAY)).toEqual({
      current: 0,
      longest: 1,
    });
  });

  it('passes over days with nothing due, such as a weekly medicine', () => {
    const streaks = streaksOf(
      [
        dose('2026-10-10', '08:00', 'taken'),
        dose('2026-10-17', '08:00', 'taken'),
        dose('2026-10-24', '08:00', 'taken'),
      ],
      TODAY,
    );
    expect(streaks).toEqual({ current: 3, longest: 3 });
  });

  it('is unmoved by as-needed doses and by days after today', () => {
    const streaks = streaksOf(
      [
        ...day('2026-10-23', 'taken', 'taken'),
        dose('2026-10-23', '14:00', 'taken', false),
        ...day('2026-10-25', 'upcoming', 'upcoming'),
      ],
      TODAY,
    );
    expect(streaks).toEqual({ current: 1, longest: 1 });
    expect(streaksOf([], TODAY)).toEqual({ current: 0, longest: 0 });
  });

  it('judges a day by all its doses, whatever order they come in', () => {
    const doses = [...day('2026-10-23', 'taken', 'missed'), ...day('2026-10-22', 'taken', 'taken')];
    expect(streaksOf(doses, TODAY)).toEqual({ current: 0, longest: 1 });
    expect(streaksOf(doses.toReversed(), TODAY)).toEqual({ current: 0, longest: 1 });
  });
});
