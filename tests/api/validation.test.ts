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
  verify: await import('@/app/api/verify/route'),
  login: await import('@/app/api/login/route'),
  loginVerify: await import('@/app/api/login/verify/route'),
  resendCode: await import('@/app/api/resend-code/route'),
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
