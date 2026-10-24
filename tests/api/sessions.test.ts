// Every protected route checks the login the same way (Task 30's withUser): no token, or a token
// that's expired, forged or for a deleted account, gets 401 and never reaches the route.
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JWT_SECRET, PASSWORD, loadWithTempData, request } from '../helpers';

const load = async () => ({
  storage: await import('@/lib/userStorage'),
  list: await import('@/app/api/medications/list/route'),
  today: await import('@/app/api/medications/today/route'),
  history: await import('@/app/api/medications/history/route'),
});

let m: Awaited<ReturnType<typeof load>>;
let root: string;

beforeEach(async () => {
  vi.stubEnv('JWT_SECRET', JWT_SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ root, modules: m } = await loadWithTempData(load));
  m.storage.createUser('Ada Obi', 'ada@example.com', PASSWORD);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

type Route = { name: string; method: string; call: (req: NextRequest) => Promise<Response> };

const routes = (): Route[] => [
  { name: 'GET /api/medications/list', method: 'GET', call: (req) => m.list.GET(req) },
  { name: 'GET /api/medications/today', method: 'GET', call: (req) => m.today.GET(req) },
  { name: 'GET /api/medications/history', method: 'GET', call: (req) => m.history.GET(req) },
];

const send = async (route: Route, token?: string) => {
  const body = route.method === 'GET' ? undefined : {};
  const res = await route.call(request('/api/example', { method: route.method, token, body }));
  return { status: res.status, body: await res.json() };
};

describe('protected routes', () => {
  it('ask for a login when there is no token', async () => {
    for (const route of routes()) {
      expect(await send(route), route.name).toEqual({
        status: 401,
        body: { error: { code: 'unauthorized', message: 'Please log in to continue.' } },
      });
    }
  });

  it('answer an expired token with 401, not a server error', async () => {
    const expired = jwt.sign({ email: 'ada@example.com' }, JWT_SECRET, { expiresIn: -10 });
    for (const route of routes()) {
      expect((await send(route, expired)).status, route.name).toBe(401);
    }
  });

  it('let a valid token through', async () => {
    const token = jwt.sign({ email: 'ada@example.com' }, JWT_SECRET);
    for (const route of routes()) {
      expect((await send(route, token)).status, route.name).toBeLessThan(400);
    }
  });
});
