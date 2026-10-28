// The dose routes, called with real session cookies against the local stack. Doses on past dates
// have settled states (missed unless recorded), so the tests use 20 to 23 October 2026.
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as list } from '@/app/api/doses/route';
import { POST as skip } from '@/app/api/doses/skip/route';
import { POST as take } from '@/app/api/doses/take/route';
import { POST as undo } from '@/app/api/doses/undo/route';
import { dbAsServer } from '@/lib/db/client';
import { addMedication, archiveMedication, type NewMedication } from '@/lib/db/medications';
import { updateProfile } from '@/lib/db/profiles';
import { saveReminderPreferences } from '@/lib/db/reminder-preferences';
import { addDays, localDate, zonedInstant } from '@/lib/schedule/time-zone';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;
let bola: TestUser;
let chidi: TestUser;
// Ada's medicines
let amlodipine: string;
let lisinopril: string;
let paracetamol: string;
let metformin: string;
// Bola's
let losartan: string;

// A time in Lagos, as the dose list writes it
const lagos = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`).toISOString();

type Handler = (request: NextRequest) => Promise<Response>;

const send = async (handler: Handler, who: TestUser | null, body?: unknown, query = '') => {
  const response = await handler(
    new NextRequest(`http://localhost/api/doses${query}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(who && { Cookie: who.cookies }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
};

const dosesOn = async (who: TestUser, date: string) =>
  (await send(list, who, undefined, `?date=${date}`)).body.doses;

// Each dose as "time name state"
const summary = (doses: { time: string; medication: { name: string }; state: string }[]) =>
  doses.map((dose) => `${dose.time} ${dose.medication.name} ${dose.state}`);

const invalid = (message: string) => ({
  status: 400,
  body: { error: { code: 'invalid_request', message } },
});

beforeAll(async () => {
  [ada, bola, chidi] = await Promise.all([
    createTestUser('Ada Obi', { plan: 'premium' }),
    createTestUser('Bola Ade'),
    createTestUser('Chidi Eze'),
  ]);
  const start_date = '2026-10-01';
  const twiceDaily = { type: 'daily', times: ['08:00', '20:00'] };
  const add = async (
    who: TestUser,
    name: string,
    schedule: NewMedication['schedule'],
    details: Partial<NewMedication> = {},
  ) => (await addMedication(who.db, who.id, { name, schedule, start_date, ...details })).id;

  amlodipine = await add(ada, 'Amlodipine', twiceDaily, {
    strength: '5mg',
    instructions: 'After food',
  });
  lisinopril = await add(ada, 'Lisinopril', twiceDaily);
  paracetamol = await add(ada, 'Paracetamol', { type: 'as_needed' });
  metformin = await add(ada, 'Metformin', twiceDaily);
  await archiveMedication(ada.db, metformin);
  // Paused at noon on the 20th (the server pauses medicines, Task 71)
  const { error } = await dbAsServer()
    .from('medications')
    .update({ paused_at: lagos('2026-10-20', '12:00') })
    .eq('id', lisinopril);
  if (error) throw error;

  losartan = await add(bola, 'Losartan', twiceDaily);
});
afterAll(deleteTestUsers);

describe('GET /api/doses', () => {
  it('needs a session', async () => {
    expect(await send(list, null)).toEqual({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'Please log in to continue.' } },
    });
  });

  it("lists a day's doses in time order, each with its state", async () => {
    const { status, body } = await send(list, ada, undefined, '?date=2026-10-20');
    expect(status).toBe(200);
    expect(body.date).toBe('2026-10-20');
    expect(body.timeZone).toBe('Africa/Lagos');
    // Archived Metformin is left out, and paused Lisinopril has no doses after noon
    expect(summary(body.doses)).toEqual([
      '08:00 Amlodipine missed',
      '08:00 Lisinopril missed',
      '20:00 Amlodipine missed',
    ]);
    expect(body.doses[0]).toEqual({
      medication: {
        id: amlodipine,
        name: 'Amlodipine',
        strength: '5mg',
        form: 'tablet',
        doseAmount: 1,
        doseUnit: 'tablet',
        instructions: 'After food',
      },
      scheduledFor: '2026-10-20T07:00:00.000Z',
      date: '2026-10-20',
      time: '08:00',
      state: 'missed',
      takenAt: null,
      skipReason: null,
      scheduled: true,
    });
  });

  it("shows today's doses unless a date is given, and later ones as upcoming", async () => {
    const today = localDate(Date.now(), 'Africa/Lagos');
    expect((await send(list, ada)).body.date).toBe(today);

    const later = await dosesOn(ada, addDays(today, 2));
    expect(summary(later)).toEqual(['08:00 Amlodipine upcoming', '20:00 Amlodipine upcoming']);
  });

  it('refuses a date that isn’t one', async () => {
    expect(await send(list, ada, undefined, '?date=2026-02-30')).toEqual(
      invalid('Give the date as YYYY-MM-DD'),
    );
  });

  it("uses the person's own time zone and grace period", async () => {
    await updateProfile(chidi.db, chidi.id, { timezone: 'America/New_York' });
    await saveReminderPreferences(chidi.db, chidi.id, { grace_minutes: 120 });
    const atorvastatin = (
      await addMedication(chidi.db, chidi.id, {
        name: 'Atorvastatin',
        schedule: { type: 'daily', times: ['08:00'] },
        start_date: '2026-10-01',
      })
    ).id;

    // 08:00 in New York is 12:00 UTC in October; taken 90 minutes later is within 2 hours
    const { body } = await send(take, chidi, {
      medicationId: atorvastatin,
      scheduledFor: '2026-10-20T08:00:00-04:00',
      takenAt: '2026-10-20T09:30:00-04:00',
    });
    expect(body.dose).toMatchObject({
      scheduledFor: '2026-10-20T12:00:00.000Z',
      date: '2026-10-20',
      time: '08:00',
      state: 'taken',
    });
    expect(summary(await dosesOn(chidi, '2026-10-20'))).toEqual(['08:00 Atorvastatin taken']);
  });
});

describe('taking, skipping and undoing a dose', () => {
  const dose = { medicationId: '', scheduledFor: lagos('2026-10-21', '08:00') };
  beforeAll(() => {
    dose.medicationId = amlodipine;
  });

  it('records it as taken at the time given', async () => {
    const { status, body } = await send(take, ada, {
      ...dose,
      takenAt: '2026-10-21T08:10:00+01:00',
    });
    expect(status).toBe(200);
    expect(body.dose).toMatchObject({
      scheduledFor: dose.scheduledFor,
      state: 'taken',
      takenAt: lagos('2026-10-21', '08:10'),
    });
    expect(summary(await dosesOn(ada, '2026-10-21')).slice(0, 1)).toEqual([
      '08:00 Amlodipine taken',
    ]);
  });

  it('keeps the first time it was taken when taken again', async () => {
    const { body } = await send(take, ada, dose);
    expect(body.dose).toMatchObject({ state: 'taken', takenAt: lagos('2026-10-21', '08:10') });
  });

  it('counts it as taken late after the grace period, and as taken now by default', async () => {
    const late = await send(take, ada, { ...dose, takenAt: '2026-10-21T09:00:00+01:00' });
    expect(late.body.dose.state).toBe('taken_late');

    const evening = { ...dose, scheduledFor: lagos('2026-10-21', '20:00') };
    const before = Date.now();
    const { body } = await send(take, ada, evening);
    expect(body.dose.state).toBe('taken_late');
    expect(Date.parse(body.dose.takenAt)).toBeGreaterThanOrEqual(before - 1000);
  });

  it('records a skip with its reason, replacing the taken record', async () => {
    const { body } = await send(skip, ada, { ...dose, reason: 'Felt dizzy' });
    expect(body.dose).toMatchObject({ state: 'skipped', skipReason: 'Felt dizzy', takenAt: null });
  });

  it('undoes it, and undoing again is harmless', async () => {
    expect((await send(undo, ada, dose)).body).toMatchObject({
      undone: true,
      dose: { scheduledFor: dose.scheduledFor, state: 'missed', skipReason: null },
    });
    expect((await send(undo, ada, dose)).body).toMatchObject({
      undone: false,
      dose: { state: 'missed' },
    });
  });

  it("refuses a time that isn't one of the medicine's doses", async () => {
    const notADose = invalid("That isn't one of this medicine's doses.");
    expect(await send(take, ada, { ...dose, scheduledFor: lagos('2026-10-21', '09:00') })).toEqual(
      notADose,
    );
    // Before it started
    expect(await send(skip, ada, { ...dose, scheduledFor: lagos('2026-09-30', '08:00') })).toEqual(
      notADose,
    );
    // After it was paused
    expect(
      await send(take, ada, {
        medicationId: lisinopril,
        scheduledFor: lagos('2026-10-20', '20:00'),
      }),
    ).toEqual(notADose);
  });

  it('refuses doses more than a day away, and taken times in the future', async () => {
    const inTwoDays = addDays(localDate(Date.now(), 'Africa/Lagos'), 2);
    const scheduledFor = new Date(zonedInstant(inTwoDays, '20:00', 'Africa/Lagos')).toISOString();
    expect(await send(take, ada, { ...dose, scheduledFor })).toEqual(
      invalid("That dose isn't due for more than a day, so it can't be recorded yet."),
    );

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    expect(await send(take, ada, { ...dose, takenAt: tomorrow })).toEqual(
      invalid("The time it was taken can't be in the future."),
    );
  });

  it('needs to know which dose of a scheduled medicine', async () => {
    expect(await send(take, ada, { medicationId: amlodipine })).toEqual(
      invalid('Say which dose this is: the time it was due.'),
    );
    expect(
      await send(skip, ada, { medicationId: 'amlodipine', scheduledFor: dose.scheduledFor }),
    ).toEqual(invalid('Say which medicine this is'));
  });

  it("doesn't record doses of an archived medicine", async () => {
    expect(await send(take, ada, { ...dose, medicationId: metformin })).toEqual(
      invalid('This medicine is archived. Restore it to record its doses.'),
    );
  });

  it("can't touch someone else's medicine", async () => {
    const notFound = {
      status: 404,
      body: { error: { code: 'not_found', message: 'That medicine could not be found.' } },
    };
    const bolas = { medicationId: losartan, scheduledFor: dose.scheduledFor };
    expect(await send(take, ada, bolas)).toEqual(notFound);
    expect(await send(skip, ada, bolas)).toEqual(notFound);
    expect(await send(undo, ada, bolas)).toEqual(notFound);
    expect(await dosesOn(bola, '2026-10-21')).toHaveLength(2);
    expect(summary(await dosesOn(bola, '2026-10-21'))).toEqual([
      '08:00 Losartan missed',
      '20:00 Losartan missed',
    ]);
  });

  it('needs a session', async () => {
    expect((await send(take, null, dose)).status).toBe(401);
  });
});

describe('as-needed medicines', () => {
  const takenAt = lagos('2026-10-22', '14:30');

  it('record a dose at the time it was taken, shown among the day’s doses', async () => {
    const { body } = await send(take, ada, { medicationId: paracetamol, takenAt });
    expect(body.dose).toMatchObject({
      medication: { id: paracetamol, name: 'Paracetamol' },
      scheduledFor: takenAt,
      time: '14:30',
      state: 'taken',
      takenAt,
      scheduled: false,
    });
    expect(summary(await dosesOn(ada, '2026-10-22'))).toEqual([
      '08:00 Amlodipine missed',
      '14:30 Paracetamol taken',
      '20:00 Amlodipine missed',
    ]);
  });

  it("can't be skipped, or recorded in the future", async () => {
    expect(await send(skip, ada, { medicationId: paracetamol, scheduledFor: takenAt })).toEqual(
      invalid('As-needed medicines have no doses to skip.'),
    );
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    expect(await send(take, ada, { medicationId: paracetamol, scheduledFor: tomorrow })).toEqual(
      invalid("An as-needed dose can't be recorded in the future."),
    );
  });

  it('disappear when undone', async () => {
    expect(
      (await send(undo, ada, { medicationId: paracetamol, scheduledFor: takenAt })).body,
    ).toEqual({ undone: true, dose: null });
    expect(summary(await dosesOn(ada, '2026-10-22'))).not.toContain('14:30 Paracetamol taken');
  });
});
