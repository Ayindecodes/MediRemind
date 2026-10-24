import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JWT_SECRET, PASSWORD, loadWithTempData, request } from '@/tests/helpers';

const load = async () => ({
  storage: await import('@/lib/userStorage'),
  withUser: (await import('./withUser')).withUser,
});

let m: Awaited<ReturnType<typeof load>>;
let root: string;

beforeEach(async () => {
  vi.stubEnv('JWT_SECRET', JWT_SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ root, modules: m } = await loadWithTempData(load));
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

// A route that answers with the signed-in user's email and the context it was given
const route = () =>
  m.withUser(async (_request, user, context: { params: Promise<{ id: string }> }) =>
    NextResponse.json({ email: user.email, id: (await context.params).id }),
  );

const call = async (headers: Record<string, string> = {}) => {
  const req = request('/api/example', { method: 'GET' });
  for (const [name, value] of Object.entries(headers)) req.headers.set(name, value);
  const res = await route()(req, { params: Promise.resolve({ id: 'med_1' }) });
  return { status: res.status, body: await res.json() };
};

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('withUser', () => {
  beforeEach(() => {
    m.storage.createUser('Ada Obi', 'ada@example.com', PASSWORD);
  });

  it('passes the signed-in user and the route context to the handler', async () => {
    const token = jwt.sign({ email: 'ada@example.com' }, JWT_SECRET);
    expect(await call(bearer(token))).toEqual({
      status: 200,
      body: { email: 'ada@example.com', id: 'med_1' },
    });
  });

  it('asks for a login when there is no token', async () => {
    expect(await call()).toEqual({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'Please log in to continue.' } },
    });
  });

  it('answers 401, not a server error, for tokens that are no longer valid', async () => {
    const expired = jwt.sign({ email: 'ada@example.com' }, JWT_SECRET, { expiresIn: -10 });
    const forged = jwt.sign({ email: 'ada@example.com' }, 'another-secret'.padEnd(40, '-'));
    const noEmail = jwt.sign({ userId: 'user_1' }, JWT_SECRET);
    const deletedUser = jwt.sign({ email: 'gone@example.com' }, JWT_SECRET);

    for (const headers of [
      bearer(expired),
      bearer(forged),
      bearer(noEmail),
      bearer(deletedUser),
      bearer('not-a-token'),
      { Authorization: jwt.sign({ email: 'ada@example.com' }, JWT_SECRET) },
    ]) {
      expect(await call(headers)).toEqual({
        status: 401,
        body: {
          error: { code: 'unauthorized', message: 'Your session has ended. Please log in again.' },
        },
      });
    }
  });

  it('answers 500 when the server has no JWT_SECRET', async () => {
    vi.stubEnv('JWT_SECRET', undefined);
    const token = jwt.sign({ email: 'ada@example.com' }, JWT_SECRET);
    expect((await call(bearer(token))).body.error.code).toBe('server_error');
  });
});
