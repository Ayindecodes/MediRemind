// Input validation (Task 29): routes check request bodies with the schemas in lib/validation.
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JWT_SECRET, PASSWORD, loadWithTempData, request } from '../helpers';

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email')>()),
  sendEmail,
}));

const load = async () => ({
  storage: await import('@/lib/userStorage'),
  signup: await import('@/app/api/signup/route'),
  verify: await import('@/app/api/verify/route'),
  login: await import('@/app/api/login/route'),
  loginVerify: await import('@/app/api/login/verify/route'),
  resendCode: await import('@/app/api/resend-code/route'),
  add: await import('@/app/api/medications/add/route'),
  list: await import('@/app/api/medications/list/route'),
  update: await import('@/app/api/medications/update/route'),
  markTaken: await import('@/app/api/medications/mark-taken/route'),
  moodLog: await import('@/app/api/mood/log/route'),
  moodToday: await import('@/app/api/mood/today/route'),
});

let m: Awaited<ReturnType<typeof load>>;
let root: string;

beforeEach(async () => {
  vi.stubEnv('JWT_SECRET', JWT_SECRET);
  sendEmail.mockReset();
  sendEmail.mockResolvedValue(true);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ root, modules: m } = await loadWithTempData(load));
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

type Handler = (req: NextRequest) => Promise<Response>;

// A verified user and a login token, as if they had signed in
function signedInUser(email: string) {
  const user = m.storage.createUser('Test User', email, PASSWORD);
  m.storage.verifyUser(email);
  return { user, token: jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET) };
}

const call = async (handler: Handler, url: string, body?: unknown, token?: string) => {
  const res = await handler(request(url, { body, token }));
  return { status: res.status, body: await res.json() };
};

// A request whose body is sent exactly as given, for bodies that aren't valid JSON
const callRaw = async (handler: Handler, url: string, body: string) => {
  const res = await handler(
    new NextRequest(`http://localhost${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }),
  );
  return { status: res.status, body: await res.json() };
};

describe('POST /api/signup', () => {
  const signup = (body: unknown) => call(m.signup.POST, '/api/signup', body);

  it('refuses a weak password before creating the account', async () => {
    const res = await signup({
      fullName: 'Ada Obi',
      email: 'ada@example.com',
      password: 'password',
    });

    expect(res).toEqual({
      status: 400,
      body: { success: false, message: 'Your password must include an uppercase letter' },
    });
    expect(m.storage.getUserByEmail('ada@example.com')).toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('answers a body that is not JSON with 400, not a server error', async () => {
    const res = await callRaw(m.signup.POST, '/api/signup', 'fullName=Ada');
    expect(res).toEqual({
      status: 400,
      body: { success: false, message: 'The request body must be valid JSON' },
    });
  });

  it('stores the email trimmed and lowercased, so it matches at login', async () => {
    const res = await signup({
      fullName: ' Ada Obi ',
      email: ' Ada@Example.COM ',
      password: PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(m.storage.getUserByEmail('ada@example.com')).toMatchObject({
      fullName: 'Ada Obi',
      email: 'ada@example.com',
    });
    expect(sendEmail.mock.calls[0][0].to).toBe('ada@example.com');
  });
});

describe('POST /api/verify', () => {
  it("doesn't count a malformed code as a wrong guess", async () => {
    m.storage.createUser('Ada Obi', 'ada@example.com', PASSWORD);
    const code = m.storage.createVerificationSession('ada@example.com', 'signup');

    for (let i = 0; i < 5; i++) {
      const res = await call(m.verify.POST, '/api/verify', {
        email: 'ada@example.com',
        code: 'abc',
      });
      expect(res.body.message).toBe('Enter the 6-digit code');
    }

    // Five wrong guesses would have deleted the code; malformed ones never reached it
    const res = await call(m.verify.POST, '/api/verify', { email: 'Ada@Example.com', code });
    expect(res).toMatchObject({ status: 200, body: { success: true } });
  });
});

describe('POST /api/login and /api/login/verify', () => {
  beforeEach(() => {
    m.storage.createUser('Ada Obi', 'ada@example.com', PASSWORD);
    m.storage.verifyUser('ada@example.com');
  });

  it('logs in with the email typed in any case, with spaces around it', async () => {
    const login = await call(m.login.POST, '/api/login', {
      email: ' ADA@example.com ',
      password: PASSWORD,
    });
    expect(login.status).toBe(200);

    const code = String(sendEmail.mock.calls[0][0].html).match(/class="code">(\d{6})</)?.[1];
    const verified = await call(m.loginVerify.POST, '/api/login/verify', {
      email: 'Ada@Example.com',
      code,
    });
    expect(verified).toMatchObject({ status: 200, body: { user: { email: 'ada@example.com' } } });
  });

  it('refuses requests missing a field, without counting a failed attempt', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await call(m.login.POST, '/api/login', { email: 'ada@example.com' });
      expect(res).toEqual({
        status: 400,
        body: { success: false, message: 'Enter your password' },
      });
    }
    expect(m.storage.checkRateLimit('ada@example.com')).toEqual({ allowed: true });
  });

  it('refuses a malformed code', async () => {
    const res = await call(m.loginVerify.POST, '/api/login/verify', {
      email: 'ada@example.com',
      code: 123456,
    });
    expect(res).toEqual({
      status: 400,
      body: { success: false, message: 'Enter the 6-digit code' },
    });
  });
});

describe('POST /api/resend-code', () => {
  it('sends the new code to the normalised address', async () => {
    m.storage.createUser('Ada Obi', 'ada@example.com', PASSWORD);

    const res = await call(m.resendCode.POST, '/api/resend-code', {
      email: ' Ada@Example.com',
      type: 'signup',
    });
    expect(res.status).toBe(200);
    expect(sendEmail.mock.calls[0][0].to).toBe('ada@example.com');
  });

  it('refuses an invalid email', async () => {
    const res = await call(m.resendCode.POST, '/api/resend-code', { email: 'ada' });
    expect(res).toEqual({
      status: 400,
      body: { success: false, message: 'Enter a valid email address' },
    });
  });
});

describe('POST /api/medications/add', () => {
  // Exactly what the add form sends when the optional fields are left empty
  const fromAddForm = {
    name: 'Amlodipine',
    dosage: '5mg',
    form: 'tablet',
    frequency: 'daily',
    times: ['08:00'],
    startDate: '2026-10-01',
    endDate: '',
    color: 'from-blue-500 to-cyan-500',
    icon: '💊',
    notes: '',
    refillReminder: '',
    enableSound: true,
    enableEmail: false,
    soundType: 'default',
    photoUrl: null,
  };

  const add = (token: string, fields: Record<string, unknown> = {}) =>
    call(m.add.POST, '/api/medications/add', { ...fromAddForm, ...fields }, token);

  const listed = async (token: string) =>
    (await call(m.list.GET, '/api/medications/list', undefined, token)).body.medications;

  it("saves the add form's request, leaving empty fields out", async () => {
    const { user, token } = signedInUser('ada@example.com');

    const res = await add(token);
    expect(res.status).toBe(201);

    const [saved] = await listed(token);
    expect(saved).toMatchObject({ userId: user.id, name: 'Amlodipine', reminders: true });
    expect(saved).not.toHaveProperty('endDate');
    expect(saved).not.toHaveProperty('notes');
    expect(saved).not.toHaveProperty('photoUrl');
  });

  it("can't set the owner, ID or completion of a new medication", async () => {
    const ada = signedInUser('ada@example.com');
    const bola = signedInUser('bola@example.com');

    const res = await add(ada.token, {
      id: 'med_chosen',
      userId: bola.user.id,
      completed: true,
      completedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(201);

    const [saved] = await listed(ada.token);
    expect(saved.userId).toBe(ada.user.id);
    expect(saved.id).not.toBe('med_chosen');
    expect(saved).not.toHaveProperty('completed');
    expect(saved).not.toHaveProperty('completedAt');
    expect(await listed(bola.token)).toEqual([]);
  });

  it('refuses an invalid medication without saving it', async () => {
    const { token } = signedInUser('ada@example.com');

    expect(await add(token, { times: ['8 in the morning'] })).toEqual({
      status: 400,
      body: { error: 'Reminder times must use the 24-hour HH:MM format' },
    });
    expect(await add(token, { endDate: '2026-09-01' })).toEqual({
      status: 400,
      body: { error: "The end date can't be before the start date" },
    });
    expect(await listed(token)).toEqual([]);
  });
});

describe('PUT /api/medications/update', () => {
  const addMedication = async (token: string, fields: Record<string, unknown> = {}) => {
    const body = { name: 'Amlodipine', dosage: '5mg', frequency: 'daily', times: ['08:00'] };
    const res = await call(
      m.add.POST,
      '/api/medications/add',
      { ...body, startDate: '2026-10-01', enableEmail: false, ...fields },
      token,
    );
    return res.body.medication;
  };

  const update = (token: string, body: unknown) =>
    call((req) => m.update.PUT(req), '/api/medications/update', body, token);

  const saved = async (token: string) =>
    (await call(m.list.GET, '/api/medications/list', undefined, token)).body.medications[0];

  it('only changes editable fields, even when sent the whole medication like the edit form does', async () => {
    const ada = signedInUser('ada@example.com');
    const bola = signedInUser('bola@example.com');
    const med = await addMedication(ada.token);

    // The edit form sends the medication back with today's doses attached
    const res = await update(ada.token, {
      ...med,
      name: 'Amlodipine Besylate',
      userId: bola.user.id,
      completed: true,
      photoUrl: 'data:image/png;base64,AAAA',
      todayDoses: [{ id: 'dose', status: 'taken' }],
    });
    expect(res.status).toBe(200);

    const after = await saved(ada.token);
    expect(after).toMatchObject({ id: med.id, userId: ada.user.id, name: 'Amlodipine Besylate' });
    expect(after).not.toHaveProperty('completed');
    expect(after).not.toHaveProperty('photoUrl');
    expect(after).not.toHaveProperty('todayDoses');
    expect(res.body.medication).toEqual(after);
  });

  it('clears the end date when the edit form sends it empty', async () => {
    const { token } = signedInUser('ada@example.com');
    const med = await addMedication(token, { endDate: '2026-10-31' });

    expect((await update(token, { ...med, endDate: '' })).status).toBe(200);
    expect(await saved(token)).not.toHaveProperty('endDate');
  });

  it('refuses edits that clash with the saved schedule', async () => {
    const { token } = signedInUser('ada@example.com');
    const med = await addMedication(token, { endDate: '2026-10-31' });

    expect(await update(token, { id: med.id, startDate: '2026-11-15' })).toEqual({
      status: 400,
      body: { error: "The end date can't be before the start date" },
    });
    expect(await update(token, { id: med.id, times: [] })).toEqual({
      status: 400,
      body: { error: 'Add at least one reminder time' },
    });
    expect(await saved(token)).toEqual(med);
  });

  it("can't edit another user's medication", async () => {
    const ada = signedInUser('ada@example.com');
    const bola = signedInUser('bola@example.com');
    const med = await addMedication(ada.token);

    expect((await update(bola.token, { id: med.id, name: 'Changed' })).status).toBe(404);
    expect((await saved(ada.token)).name).toBe('Amlodipine');
  });
});

describe('POST /api/medications/mark-taken', () => {
  it('answers a missing or non-text dose ID with 400, not a server error', async () => {
    const { token } = signedInUser('ada@example.com');
    const markTaken = (body: unknown) =>
      call(m.markTaken.POST, '/api/medications/mark-taken', body, token);

    expect(await markTaken({})).toEqual({ status: 400, body: { error: 'Missing the dose ID' } });
    expect(await markTaken({ medicationId: 42 })).toEqual({
      status: 400,
      body: { error: 'Missing the dose ID' },
    });
  });
});

describe('POST /api/mood/log', () => {
  it("saves the dashboard's mood and refuses anything else", async () => {
    const { token } = signedInUser('ada@example.com');
    const log = (body: unknown) => call(m.moodLog.POST, '/api/mood/log', body, token);
    const today = async () =>
      (await call(m.moodToday.GET, '/api/mood/today', undefined, token)).body.mood;

    expect(await log({ mood: 'ecstatic' })).toEqual({
      status: 400,
      body: { error: 'Choose how you are feeling' },
    });
    expect(await today()).toBeNull();

    // What the dashboard sends
    const res = await log({ mood: 'neutral', date: new Date().toISOString(), note: '' });
    expect(res.status).toBe(200);
    expect(res.body.mood).not.toHaveProperty('note');
    expect(await today()).toBe('neutral');
  });
});
