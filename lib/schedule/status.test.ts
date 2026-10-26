import { describe, expect, it } from 'vitest';
import { dosesBetween } from './doses';
import { scheduleSchema } from './schema';
import { doseState, withStates, type DoseRecord } from './status';

// 8:00 am in Lagos on 26 October 2026
const DUE = '2026-10-26T07:00:00.000Z';
const at = (lagosTime: string) => new Date(`2026-10-26T${lagosTime}:00+01:00`);

describe('doseState with nothing recorded', () => {
  it('is upcoming before its time, due from its time, missed after an hour', () => {
    expect(doseState(DUE, null, at('07:59'))).toBe('upcoming');
    expect(doseState(DUE, null, at('08:00'))).toBe('due');
    expect(doseState(DUE, null, at('08:59'))).toBe('due');
    expect(doseState(DUE, null, at('09:00'))).toBe('missed');
  });

  it("follows the person's own grace period", () => {
    expect(doseState(DUE, null, at('08:31'), 30)).toBe('missed');
    expect(doseState(DUE, null, at('09:30'), 120)).toBe('due');
  });
});

describe('doseState with something recorded', () => {
  const taken = (time: string) => ({ status: 'taken' as const, taken_at: at(time).toISOString() });

  it('is taken when taken within the hour, or early', () => {
    expect(doseState(DUE, taken('08:20'), at('12:00'))).toBe('taken');
    expect(doseState(DUE, taken('07:45'), at('07:50'))).toBe('taken');
  });

  it('is taken late when taken after it was missed, which is allowed', () => {
    expect(doseState(DUE, taken('09:00'), at('12:00'))).toBe('taken_late');
    expect(doseState(DUE, taken('10:15'), at('12:00'), 120)).toBe('taken_late');
    expect(doseState(DUE, taken('09:30'), at('12:00'), 120)).toBe('taken');
  });

  it('is skipped whenever the person chose to skip it', () => {
    const skipped = { status: 'skipped' as const, taken_at: null };
    expect(doseState(DUE, skipped, at('07:00'))).toBe('skipped');
    expect(doseState(DUE, skipped, at('12:00'))).toBe('skipped');
  });

  it('is missed when the system recorded it missed', () => {
    expect(doseState(DUE, { status: 'missed', taken_at: null }, at('09:05'))).toBe('missed');
  });
});

describe('withStates', () => {
  const schedule = scheduleSchema.parse({ type: 'daily', times: ['08:00', '14:00', '20:00'] });
  const doses = dosesBetween(
    { schedule, startDate: '2026-10-26' },
    'Africa/Lagos',
    at('00:00'),
    at('23:59'),
  );

  it("gives each of today's doses its state", () => {
    const records: DoseRecord[] = [
      // Recorded with the Lagos offset; the schedule gives UTC. Both are 08:00 in Lagos.
      {
        scheduled_for: '2026-10-26T08:00:00+01:00',
        status: 'taken',
        taken_at: at('08:10').toISOString(),
      },
    ];
    expect(
      withStates(doses, records, 'Africa/Lagos', at('15:30')).map((d) => [d.time, d.state]),
    ).toEqual([
      ['08:00', 'taken'],
      ['14:00', 'missed'],
      ['20:00', 'upcoming'],
    ]);
  });

  it('carries the time taken and the reason for a skip', () => {
    const [morning, afternoon] = withStates(
      doses,
      [
        { scheduled_for: DUE, status: 'taken', taken_at: at('08:10').toISOString() },
        {
          scheduled_for: '2026-10-26T13:00:00Z',
          status: 'skipped',
          taken_at: null,
          skip_reason: 'felt unwell',
        },
      ],
      'Africa/Lagos',
      at('15:30'),
    );
    expect(morning).toMatchObject({ takenAt: '2026-10-26T07:10:00.000Z', scheduled: true });
    expect(afternoon).toMatchObject({ state: 'skipped', skipReason: 'felt unwell' });
  });

  it('keeps recorded doses the schedule does not have, such as as-needed ones, in time order', () => {
    const paracetamol: DoseRecord = {
      scheduled_for: '2026-10-26T10:30:00Z',
      status: 'taken',
      taken_at: '2026-10-26T10:30:00Z',
    };
    const timeline = withStates(doses, [paracetamol], 'Africa/Lagos', at('15:30'));
    expect(timeline.map((d) => d.time)).toEqual(['08:00', '11:30', '14:00', '20:00']);
    expect(timeline[1]).toMatchObject({
      date: '2026-10-26',
      time: '11:30',
      state: 'taken',
      scheduled: false,
    });
  });
});
