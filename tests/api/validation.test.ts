// Input validation (Task 29): routes check request bodies with the schemas in lib/validation.
import fs from 'node:fs';
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
