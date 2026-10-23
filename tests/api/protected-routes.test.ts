// Regression tests for protected routes (Phase 0 Tasks 6-7, the delete fix from Task 22, plan limits).
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CRON_SECRET, JWT_SECRET, PASSWORD, loadWithTempData, request } from '../helpers';

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email')>()),
  sendEmail,
}));

const load = async () => ({
  storage: await import('@/lib/userStorage'),
  upgrade: await import('@/app/api/user/upgrade/route'),
  profile: await import('@/app/api/user/profile/route'),
  add: await import('@/app/api/medications/add/route'),
  list: await import('@/app/api/medications/list/route'),
  remove: await import('@/app/api/medications/delete/[id]/route'),
  completions: await import('@/app/api/medications/check-completions/route'),
  notifications: await import('@/app/api/notifications/route'),
});

let m: Awaited<ReturnType<typeof load>>;
let root: string;

beforeEach(async () => {
  vi.stubEnv('JWT_SECRET', JWT_SECRET);
  vi.stubEnv('CRON_SECRET', CRON_SECRET);
  sendEmail.mockReset();
  sendEmail.mockResolvedValue(true);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ root, modules: m } = await loadWithTempData(load));
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

// A verified user and a login token, as if they had signed in
function signedInUser(email: string) {
  const user = m.storage.createUser('Test User', email, PASSWORD);
  m.storage.verifyUser(email);
  return { user, token: jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET) };
}

const json = async (res: Response) => ({ status: res.status, body: await res.json() });

const addMedication = (token: string, fields: Record<string, unknown> = {}) =>
  m.add.POST(
    request('/api/medications/add', {
      token,
      body: {
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'daily',
        times: ['08:00'],
        startDate: '2026-10-01',
        enableEmail: false,
        ...fields,
      },
    }),
  );

const listNames = async (token: string) => {
  const res = await m.list.GET(request('/api/medications/list', { method: 'GET', token }));
  return (await res.json()).medications.map((med: { name: string }) => med.name);
};

describe('POST /api/user/upgrade (Task 6)', () => {
  it('refuses to change the plan, since there is no payment yet', async () => {
    const { token } = signedInUser('ada@example.com');

    // The handler refuses before looking at the request at all
    const res = await json(await m.upgrade.POST());
    expect(res.status).toBe(403);

    const profile = await json(
      await m.profile.GET(request('/api/user/profile', { method: 'GET', token })),
    );
    expect(profile.body.plan).toBe('free');
  });
});

describe('GET /api/medications/check-completions (Task 7)', () => {
  // Sends `Authorization: Bearer <secret>`, as Vercel Cron does
  const cron = (secret?: string) =>
    m.completions.GET(
      request('/api/medications/check-completions', { method: 'GET', token: secret }),
    );

  it('handles a fresh install with no medications file', async () => {
    const res = await json(await cron(CRON_SECRET));
    expect(res).toMatchObject({ status: 200, body: { completedCount: 0 } });
  });

  it('rejects requests without CRON_SECRET, including signed-in users', async () => {
    const { token } = signedInUser('ada@example.com');

    expect((await cron()).status).toBe(401);
    expect((await cron(token)).status).toBe(401);
    expect((await cron('x'.repeat(40))).status).toBe(401);
  });

  it('completes ended courses when called with CRON_SECRET', async () => {
    const { token } = signedInUser('ada@example.com');
    await addMedication(token, { name: 'Amoxicillin', endDate: '2026-01-15' });

    const res = await json(await cron(CRON_SECRET));
    expect(res).toMatchObject({ status: 200, body: { completedCount: 1 } });

    const again = await json(await cron(CRON_SECRET));
    expect(again.body.completedCount).toBe(0);
  });

  it('refuses to run at all when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', undefined);
    expect((await cron('anything')).status).toBe(500);
  });
});

describe('DELETE /api/medications/delete/[id] (restored in Task 22)', () => {
  const remove = (id: string, token?: string) =>
    m.remove.DELETE(request(`/api/medications/delete/${id}`, { method: 'DELETE', token }), {
      params: Promise.resolve({ id }),
    });

  it('requires a login', async () => {
    expect((await remove('med_1')).status).toBe(401);
  });

  it("can't delete another user's medication", async () => {
    const owner = signedInUser('owner@example.com');
    const other = signedInUser('other@example.com');
    const { body } = await json(await addMedication(owner.token));

    expect((await remove(body.medication.id, other.token)).status).toBe(404);
    expect(await listNames(owner.token)).toEqual(['Amlodipine']);
  });

  it('deletes your own medication and tells you', async () => {
    const { token } = signedInUser('ada@example.com');
    const { body } = await json(await addMedication(token));

    expect((await remove(body.medication.id, token)).status).toBe(200);
    expect(await listNames(token)).toEqual([]);

    const res = await m.notifications.GET(request('/api/notifications', { method: 'GET', token }));
    expect((await res.json()).notifications[0].message).toBe(
      'Medication "Amlodipine" has been deleted',
    );
  });
});

describe('POST /api/medications/add: free plan limits', () => {
  it('allows 3 medications and refuses a 4th', async () => {
    const { token } = signedInUser('ada@example.com');
    for (const name of ['A', 'B', 'C'])
      expect((await addMedication(token, { name })).status).toBe(201);

    const fourth = await json(await addMedication(token, { name: 'D' }));
    expect(fourth.status).toBe(403);
    expect(fourth.body.upgradeRequired).toBe(true);
  });

  it('refuses pill photos', async () => {
    const { token } = signedInUser('ada@example.com');

    const res = await json(await addMedication(token, { photoUrl: 'data:image/png;base64,AAAA' }));
    expect(res.status).toBe(403);
    expect(res.body.upgradeRequired).toBe(true);
  });
});
