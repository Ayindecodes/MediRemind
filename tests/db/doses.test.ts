import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDose, listDoses, recordDose, undoDose } from '@/lib/db/doses';
import { addMedication } from '@/lib/db/medications';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;
let bola: TestUser;
let adaMedicine: string;
let bolaMedicine: string;

// 08:00 in Lagos on 24 October, written in UTC
const EIGHT_AM = '2026-10-24T07:00:00.000Z';

beforeAll(async () => {
  [ada, bola] = await Promise.all([createTestUser('Ada Obi'), createTestUser('Bola Ade')]);
  const schedule = { type: 'daily', times: ['08:00'] };
  adaMedicine = (
    await addMedication(ada.db, ada.id, { name: 'Amlodipine', schedule, start_date: '2026-10-01' })
  ).id;
  bolaMedicine = (
    await addMedication(bola.db, bola.id, { name: 'Metformin', schedule, start_date: '2026-10-01' })
  ).id;
});
afterAll(deleteTestUsers);

describe('recordDose', () => {
  it('records a dose as taken now, from the app', async () => {
    const before = Date.now();
    const dose = await recordDose(ada.db, ada.id, {
      medicationId: adaMedicine,
      scheduledFor: EIGHT_AM,
      status: 'taken',
    });
    expect(dose).toMatchObject({ status: 'taken', source: 'app', skip_reason: null });
    expect(new Date(dose.taken_at!).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('counts a repeated tap once, however the time is written', async () => {
    await recordDose(ada.db, ada.id, {
      medicationId: adaMedicine,
      scheduledFor: '2026-10-24T08:00:00+01:00',
      status: 'taken',
    });
    const doses = await listDoses(ada.db, ada.id, {
      from: '2026-10-24T00:00:00Z',
      to: '2026-10-25T00:00:00Z',
    });
    expect(doses).toHaveLength(1);
  });

  it('replaces the record when the dose is changed to skipped', async () => {
    const dose = await recordDose(ada.db, ada.id, {
      medicationId: adaMedicine,
      scheduledFor: EIGHT_AM,
      status: 'skipped',
      skipReason: 'felt unwell',
    });
    expect(dose).toMatchObject({ status: 'skipped', taken_at: null, skip_reason: 'felt unwell' });
  });

  it("can't record a dose of someone else's medicine", async () => {
    await expect(
      recordDose(ada.db, ada.id, {
        medicationId: bolaMedicine,
        scheduledFor: EIGHT_AM,
        status: 'taken',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('listDoses', () => {
  it("returns only the person's own doses in the time range", async () => {
    await recordDose(bola.db, bola.id, {
      medicationId: bolaMedicine,
      scheduledFor: EIGHT_AM,
      status: 'taken',
    });
    await recordDose(ada.db, ada.id, {
      medicationId: adaMedicine,
      scheduledFor: '2026-10-23T07:00:00Z',
      status: 'taken',
    });

    const doses = await listDoses(ada.db, ada.id, {
      from: '2026-10-24T00:00:00Z',
      to: '2026-10-25T00:00:00Z',
    });
    expect(doses.map((d) => d.medication_id)).toEqual([adaMedicine]);
    expect(await listDoses(ada.db, bola.id, { from: '2026-10-01', to: '2026-11-01' })).toEqual([]);
  });
});

describe('listDoses with a long history', () => {
  it('returns every record, not just the first 1000', async () => {
    const chidi = await createTestUser('Chidi Eze');
    const medicine = await addMedication(chidi.db, chidi.id, {
      name: 'Metformin',
      schedule: { type: 'every_n_hours', everyHours: 1, firstDose: '00:00' },
      start_date: '2020-01-01',
    });
    // 1001 hourly doses, all taken
    const first = Date.parse('2020-01-01T00:00:00Z');
    const records = Array.from({ length: 1001 }, (_, i) => ({
      user_id: chidi.id,
      medication_id: medicine.id,
      scheduled_for: new Date(first + i * 3_600_000).toISOString(),
      status: 'taken',
      taken_at: new Date(first + i * 3_600_000).toISOString(),
    }));
    const { error } = await chidi.db.from('dose_logs').insert(records);
    expect(error).toBeNull();

    const doses = await listDoses(chidi.db, chidi.id, { from: '2020-01-01', to: '2020-03-01' });
    expect(doses).toHaveLength(1001);
    expect(Date.parse(doses.at(-1)!.scheduled_for)).toBe(first + 1000 * 3_600_000);
    // Pages join up without a gap or a repeat
    expect(new Set(doses.map((dose) => dose.id)).size).toBe(1001);
  });
});

describe('getDose', () => {
  it('finds the record for a dose, however the time is written', async () => {
    await recordDose(ada.db, ada.id, {
      medicationId: adaMedicine,
      scheduledFor: EIGHT_AM,
      status: 'taken',
    });
    expect(
      await getDose(ada.db, {
        medicationId: adaMedicine,
        scheduledFor: '2026-10-24T08:00:00+01:00',
      }),
    ).toMatchObject({ medication_id: adaMedicine, status: 'taken' });
  });

  it("finds nothing for a dose with no record, or someone else's", async () => {
    expect(
      await getDose(ada.db, { medicationId: adaMedicine, scheduledFor: '2026-10-25T07:00:00Z' }),
    ).toBeNull();
    expect(
      await getDose(ada.db, { medicationId: bolaMedicine, scheduledFor: EIGHT_AM }),
    ).toBeNull();
  });
});

describe('undoDose', () => {
  it('removes a record, once', async () => {
    const dose = { medicationId: adaMedicine, scheduledFor: EIGHT_AM };
    expect(await undoDose(ada.db, dose)).toBe(true);
    expect(await undoDose(ada.db, dose)).toBe(false);
  });

  it("leaves someone else's record alone", async () => {
    expect(await undoDose(ada.db, { medicationId: bolaMedicine, scheduledFor: EIGHT_AM })).toBe(
      false,
    );
    const bolasDoses = await listDoses(bola.db, bola.id, { from: '2026-10-01', to: '2026-11-01' });
    expect(bolasDoses).toHaveLength(1);
  });
});
