// The medicines routes (/api/medications), called with real session cookies against the local stack
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DELETE as remove, GET as read, PATCH as change } from '@/app/api/medications/[id]/route';
import { POST as restore } from '@/app/api/medications/[id]/restore/route';
import { POST as add, GET as list } from '@/app/api/medications/route';
import { updateProfile } from '@/lib/db/profiles';
import { localDate } from '@/lib/schedule/time-zone';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;
let bola: TestUser;
let chidi: TestUser;

type Handler = (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

const send = async (
  handler: Handler,
  who: TestUser | null,
  { id = '', body, query = '' }: { id?: string; body?: unknown; query?: string } = {},
) => {
  const response = await handler(
    new NextRequest(`http://localhost/api/medications${query}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(who && { Cookie: who.cookies }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: response.status, body: await response.json() };
};

const daily = { type: 'daily', times: ['08:00', '20:00'] };
// Artemether-lumefantrine: six doses over three days
const course = { type: 'course', firstDose: '08:00', offsetsHours: [0, 8, 24, 36, 48, 60] };

const addMedicine = async (who: TestUser, details: object) =>
  (await send(add, who, { body: { schedule: daily, ...details } })).body.medication;

const names = async (who: TestUser, query = '') =>
  (await send(list, who, { query })).body.medications.map((m: { name: string }) => m.name);

const error = (status: number, code: string, message: string) => ({
  status,
  body: { error: { code, message } },
});

const notFound = error(404, 'not_found', 'That medicine could not be found.');

beforeAll(async () => {
  [ada, bola, chidi] = await Promise.all([
    createTestUser('Ada Obi', { plan: 'premium' }),
    createTestUser('Bola Ade'),
    createTestUser('Chidi Eze'),
  ]);
});
afterAll(deleteTestUsers);

describe('adding a medicine', () => {
  it('needs only a name and a schedule, and starts today', async () => {
    const { status, body } = await send(add, ada, {
      body: { name: 'Amlodipine', schedule: daily },
    });
    expect(status).toBe(201);
    expect(body.medication).toMatchObject({
      name: 'Amlodipine',
      form: 'tablet',
      doseAmount: 1,
      doseUnit: 'tablet',
      schedule: daily,
      startDate: localDate(Date.now(), 'Africa/Lagos'),
      endDate: null,
      status: 'active',
      archivedAt: null,
    });
    expect(body.medication.nextDose).not.toBeNull();
  });

  it('keeps every detail, as reading it back shows', async () => {
    const details = {
      name: 'Metformin',
      strength: '500 mg',
      form: 'tablet',
      doseAmount: 2,
      doseUnit: 'tablet',
      schedule: { type: 'daily', times: ['08:00', '20:00'], preset: 'bd' },
      startDate: '2026-10-01',
      endDate: '2027-03-31',
      instructions: 'With food',
      notes: 'For diabetes',
      appearance: { shape: 'oblong', color: 'white' },
      nafdacNumber: 'a4-5678',
      quantityRemaining: 56.5,
      refillAlertDays: 7,
      reminderChannels: ['push', 'sms'],
    };
    const added = await addMedicine(ada, details);
    expect(added).toMatchObject({ ...details, nafdacNumber: 'A4-5678' });
    expect((await send(read, ada, { id: added.id })).body.medication).toEqual(added);
  });

  it("counts doses in the form's usual unit", async () => {
    expect((await addMedicine(ada, { name: 'Cough syrup', form: 'liquid' })).doseUnit).toBe('ml');
  });

  it('ends a course on the day of its last dose', async () => {
    const coartem = await addMedicine(ada, {
      name: 'Coartem',
      schedule: course,
      startDate: '2026-10-01',
    });
    expect(coartem).toMatchObject({ endDate: '2026-10-03', status: 'finished', nextDose: null });
  });

  it('refuses an end date before the start, and anything the rules forbid', async () => {
    expect(
      await send(add, ada, {
        body: {
          name: 'Amlodipine',
          schedule: daily,
          startDate: '2026-10-10',
          endDate: '2026-10-09',
        },
      }),
    ).toEqual(error(400, 'invalid_request', "The end date can't be before the start date."));
    expect(await send(add, ada, { body: { name: 'Amlodipine' } })).toEqual(
      error(400, 'invalid_request', 'Choose how often it is taken'),
    );
  });

  it('ignores what people may not set, such as the owner or a pause', async () => {
    const added = await addMedicine(ada, {
      name: 'Losartan',
      userId: bola.id,
      pausedAt: '2026-10-01T00:00:00Z',
      photoPath: 'someone/else.png',
    });
    expect(added.status).toBe('active');
    expect(await names(ada)).toContain('Losartan');
    expect(await names(bola)).not.toContain('Losartan');
  });

  it("uses the person's own time zone", async () => {
    await updateProfile(chidi.db, chidi.id, { timezone: 'America/New_York' });
    const added = await addMedicine(chidi, {
      name: 'Atorvastatin',
      schedule: { type: 'daily', times: ['21:00'] },
    });
    expect(added.startDate).toBe(localDate(Date.now(), 'America/New_York'));
    expect(added.nextDose.time).toBe('21:00');
    // 21:00 in New York is 01:00 or 02:00 UTC, the next day
    expect(['01:00', '02:00']).toContain(added.nextDose.scheduledFor.slice(11, 16));
  });

  it('needs a session', async () => {
    expect((await send(add, null, { body: { name: 'Amlodipine', schedule: daily } })).status).toBe(
      401,
    );
    expect((await send(list, null)).status).toBe(401);
  });
});

describe('the free plan', () => {
  it('allows 3 active medicines, not counting finished courses', async () => {
    for (const name of ['Amlodipine', 'Metformin', 'Losartan']) {
      expect((await send(add, bola, { body: { name, schedule: daily } })).status).toBe(201);
    }
    expect(await send(add, bola, { body: { name: 'Lisinopril', schedule: daily } })).toEqual(
      error(
        403,
        'upgrade_required',
        'The free plan allows 3 active medicines. Archive one or upgrade to add more.',
      ),
    );
    // A course that's already over doesn't count
    const coartem = await addMedicine(bola, {
      name: 'Coartem',
      schedule: course,
      startDate: '2026-10-01',
    });
    expect(coartem.status).toBe('finished');
  });

  it('frees a place when one is deleted, and refuses to restore it while full', async () => {
    const [amlodipine] = (await send(list, bola)).body.medications;
    await send(remove, bola, { id: amlodipine.id, body: {} });
    expect((await send(add, bola, { body: { name: 'Lisinopril', schedule: daily } })).status).toBe(
      201,
    );
    expect((await send(restore, bola, { id: amlodipine.id, body: {} })).body.error.code).toBe(
      'upgrade_required',
    );
  });
});

describe('listing medicines', () => {
  it('lists current medicines, finished ones included, and archived ones apart', async () => {
    expect(await names(bola)).toEqual(['Metformin', 'Losartan', 'Coartem', 'Lisinopril']);
    expect(await names(bola, '?archived=true')).toEqual(['Amlodipine']);
    expect(await send(list, bola, { query: '?archived=maybe' })).toEqual(
      error(400, 'invalid_request', 'Send archived as true or false'),
    );
  });
});

describe('changing a medicine', () => {
  let id: string;
  beforeAll(async () => {
    id = (
      await addMedicine(ada, { name: 'Vitamin D', strength: '1000 IU', startDate: '2026-10-01' })
    ).id;
  });

  it('changes only what is sent, and clears with null', async () => {
    const { body } = await send(change, ada, { id, body: { notes: 'Weekly', strength: null } });
    expect(body.medication).toMatchObject({
      name: 'Vitamin D',
      notes: 'Weekly',
      strength: null,
      schedule: daily,
    });
  });

  it('checks the dates as they will be saved', async () => {
    await send(change, ada, { id, body: { endDate: '2026-12-31' } });
    expect(await send(change, ada, { id, body: { startDate: '2027-01-01' } })).toEqual(
      error(400, 'invalid_request', "The end date can't be before the start date."),
    );
  });

  it('ends a course with its last dose, and stops ending it there when it stops being a course', async () => {
    const asCourse = await send(change, ada, {
      id,
      body: { schedule: course, startDate: '2026-11-01', endDate: null },
    });
    expect(asCourse.body.medication.endDate).toBe('2026-11-03');

    const asDaily = await send(change, ada, { id, body: { schedule: daily } });
    expect(asDaily.body.medication).toMatchObject({ endDate: null, schedule: daily });
  });

  it('needs at least one change', async () => {
    expect(await send(change, ada, { id, body: { archivedAt: null } })).toEqual(
      error(400, 'invalid_request', 'Send at least one change'),
    );
  });
});

describe('deleting and restoring a medicine', () => {
  let id: string;
  beforeAll(async () => {
    id = (await addMedicine(ada, { name: 'Omeprazole' })).id;
  });

  it('archives it, and deleting again changes nothing', async () => {
    const first = (await send(remove, ada, { id, body: {} })).body.medication;
    expect(first).toMatchObject({ status: 'archived', nextDose: null });
    const second = (await send(remove, ada, { id, body: {} })).body.medication;
    expect(second.archivedAt).toBe(first.archivedAt);
    expect(await names(ada)).not.toContain('Omeprazole');
  });

  it("can't be changed while archived", async () => {
    expect(await send(change, ada, { id, body: { notes: 'x' } })).toEqual(
      error(400, 'invalid_request', 'This medicine is archived. Restore it to change it.'),
    );
  });

  it('restores it, and restoring again changes nothing', async () => {
    const restored = (await send(restore, ada, { id, body: {} })).body.medication;
    expect(restored).toMatchObject({ status: 'active', archivedAt: null });
    expect((await send(restore, ada, { id, body: {} })).body.medication.archivedAt).toBeNull();
    expect(await names(ada)).toContain('Omeprazole');
  });
});

describe("someone else's medicine", () => {
  it('looks like it does not exist', async () => {
    const id = (await send(list, bola)).body.medications[0].id;
    expect(await send(read, ada, { id })).toEqual(notFound);
    expect(await send(change, ada, { id, body: { notes: 'mine now' } })).toEqual(notFound);
    expect(await send(remove, ada, { id, body: {} })).toEqual(notFound);
    expect(await send(restore, ada, { id, body: {} })).toEqual(notFound);
    expect((await send(read, bola, { id })).body.medication.notes).toBeNull();
  });

  it('nor does anything that is not an ID', async () => {
    expect(await send(read, ada, { id: 'med_1_abc' })).toEqual(notFound);
  });
});
