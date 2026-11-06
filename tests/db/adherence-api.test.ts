// GET /api/adherence, called with real session cookies against the local stack. The dates are
// relative to today, so the states are settled: the medicines end yesterday.
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as adherence } from '@/app/api/adherence/route';
import { dbAsServer } from '@/lib/db/client';
import { recordDose } from '@/lib/db/doses';
import { addMedication } from '@/lib/db/medications';
import { updateProfile } from '@/lib/db/profiles';
import { addDays, localDate, zonedInstant } from '@/lib/schedule/time-zone';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

const LAGOS = 'Africa/Lagos';
const today = localDate(Date.now(), LAGOS);
// A day relative to today, and a Lagos time on it
const day = (n: number) => addDays(today, n);
const at = (n: number, time: string) => new Date(zonedInstant(day(n), time, LAGOS)).toISOString();

let ada: TestUser;
let bola: TestUser;
let chidi: TestUser;

const send = async (who: TestUser | null, query = '') => {
  const response = await adherence(
    new NextRequest(`http://localhost/api/adherence${query}`, {
      headers: who ? { Cookie: who.cookies } : {},
    }),
  );
  return { status: response.status, body: await response.json() };
};

const none = {
  scheduled: 0,
  taken: 0,
  takenLate: 0,
  skipped: 0,
  missed: 0,
  pending: 0,
  rate: null,
};

beforeAll(async () => {
  [ada, bola, chidi] = await Promise.all([
    createTestUser('Ada Obi', { plan: 'premium' }),
    createTestUser('Bola Ade'),
    createTestUser('Chidi Eze'),
  ]);

  // Amlodipine, twice a day for the last ten days, ending yesterday
  const amlodipine = await addMedication(ada.db, ada.id, {
    name: 'Amlodipine',
    strength: '5 mg',
    schedule: { type: 'daily', times: ['08:00', '20:00'] },
    start_date: day(-10),
    end_date: day(-1),
  });
  const take = (medicationId: string, n: number, time: string, lateHours = 0) =>
    recordDose(ada.db, ada.id, {
      medicationId,
      scheduledFor: at(n, time),
      status: 'taken',
      takenAt: new Date(Date.parse(at(n, time)) + lateHours * 3_600_000).toISOString(),
    });
  // Days -10 to -8: nothing recorded. Day -7: one skipped. Day -6: both missed.
  await recordDose(ada.db, ada.id, {
    medicationId: amlodipine.id,
    scheduledFor: at(-7, '08:00'),
    status: 'skipped',
    skipReason: 'Felt dizzy',
  });
  await take(amlodipine.id, -7, '20:00');
  // Days -5 to -1: every dose taken, one of them late
  for (let n = -5; n <= -1; n++) {
    await take(amlodipine.id, n, '08:00');
    await take(amlodipine.id, n, '20:00', n === -3 ? 2 : 0);
  }

  // Metformin, once a day from ten days ago, deleted at noon two days ago
  const metformin = await addMedication(ada.db, ada.id, {
    name: 'Metformin',
    schedule: { type: 'daily', times: ['08:00'] },
    start_date: day(-10),
  });
  for (let n = -5; n <= -2; n++) await take(metformin.id, n, '08:00');
  const { error } = await dbAsServer()
    .from('medications')
    .update({ archived_at: at(-2, '12:00') })
    .eq('id', metformin.id);
  if (error) throw error;

  // Paracetamol as needed, one taken today
  const paracetamol = await addMedication(ada.db, ada.id, {
    name: 'Paracetamol',
    schedule: { type: 'as_needed' },
    start_date: day(-10),
  });
  const anHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  await recordDose(ada.db, ada.id, {
    medicationId: paracetamol.id,
    scheduledFor: anHourAgo,
    status: 'taken',
    takenAt: anHourAgo,
  });
});
afterAll(deleteTestUsers);

describe('GET /api/adherence', () => {
  it('gives the streaks over the whole history and the last week by default', async () => {
    const { status, body } = await send(ada);
    expect(status).toBe(200);
    // Five perfect days in a row up to yesterday; today has nothing due, so it is passed over
    expect(body.streak).toEqual({ current: 5, longest: 5 });
    expect(body.period).toEqual({ from: day(-6), to: today, days: 7 });
    // Days -6 to -1: Amlodipine 12 doses, Metformin 5 (its last was two days ago)
    expect(body.overall).toEqual({
      scheduled: 17,
      taken: 13,
      takenLate: 1,
      skipped: 0,
      missed: 3,
      pending: 0,
      rate: 82,
    });
    // Every dose ever taken, the as-needed one included
    expect(body.totalDosesTaken).toBe(16);
  });

  it('breaks the week down by medicine, deleted ones included up to when they went', async () => {
    const { body } = await send(ada);
    expect(body.byMedication).toEqual([
      {
        medication: expect.objectContaining({ name: 'Amlodipine', strength: '5 mg' }),
        scheduled: 12,
        taken: 9,
        takenLate: 1,
        skipped: 0,
        missed: 2,
        pending: 0,
        rate: 83,
      },
      {
        medication: expect.objectContaining({ name: 'Metformin' }),
        scheduled: 5,
        taken: 4,
        takenLate: 0,
        skipped: 0,
        missed: 1,
        pending: 0,
        rate: 80,
      },
    ]);
    // As-needed medicines have nothing to adhere to
    expect(
      body.byMedication.map((m: { medication: { name: string } }) => m.medication.name),
    ).not.toContain('Paracetamol');
  });

  it('covers as many days as asked', async () => {
    const { body } = await send(ada, '?days=30');
    expect(body.period).toEqual({ from: day(-29), to: today, days: 30 });
    // All 20 Amlodipine doses and all 9 Metformin ones
    expect(body.overall).toEqual({
      scheduled: 29,
      taken: 14,
      takenLate: 1,
      skipped: 1,
      missed: 13,
      pending: 0,
      rate: 52,
    });
    expect(body.streak).toEqual({ current: 5, longest: 5 });
  });

  it('refuses a period that is not between 1 and 365 days', async () => {
    expect(await send(ada, '?days=0')).toEqual({
      status: 400,
      body: { error: { code: 'invalid_request', message: 'Ask for between 1 and 365 days' } },
    });
  });

  it('starts from nothing for someone with no medicines', async () => {
    const { body } = await send(bola);
    expect(body).toEqual({
      streak: { current: 0, longest: 0 },
      period: { from: day(-6), to: today, days: 7 },
      overall: none,
      byMedication: [],
      totalDosesTaken: 0,
    });
  });

  it("works on the person's own calendar", async () => {
    await updateProfile(chidi.db, chidi.id, { timezone: 'Pacific/Auckland' });
    const { body } = await send(chidi);
    expect(body.period.to).toBe(localDate(Date.now(), 'Pacific/Auckland'));
  });

  it('needs a session', async () => {
    expect((await send(null)).status).toBe(401);
  });
});
