// Regression tests for the sign-in fixes (Phase 0, Tasks 1-3 and 9), calling the real route handlers.
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JWT_SECRET, PASSWORD, lastCodeSentTo, loadWithTempData, request } from '../helpers';

// Emails are recorded instead of sent, so tests read sign-in codes from them like a user would
const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email')>()),
  sendEmail,
}));

const loadRoutes = async () => ({
  signup: await import('@/app/api/signup/route'),
  verify: await import('@/app/api/verify/route'),
  resendCode: await import('@/app/api/resend-code/route'),
  login: await import('@/app/api/login/route'),
  loginVerify: await import('@/app/api/login/verify/route'),
  profile: await import('@/app/api/user/profile/route'),
});

let routes: Awaited<ReturnType<typeof loadRoutes>>;
let root: string;

beforeEach(async () => {
  vi.stubEnv('JWT_SECRET', JWT_SECRET);
  sendEmail.mockReset();
  sendEmail.mockResolvedValue(true);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ root, modules: routes } = await loadWithTempData(loadRoutes));
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const call = async (
  handler: (req: ReturnType<typeof request>) => Promise<Response>,
  url: string,
  body?: unknown,
  token?: string,
) => {
  const res = await handler(request(url, { body, token }));
  return { status: res.status, body: await res.json() };
};

async function signUp(email: string, fullName = 'Ada Obi') {
  await call(routes.signup.POST, '/api/signup', { fullName, email, password: PASSWORD });
  const code = lastCodeSentTo(sendEmail, email);
  return { code, verify: () => call(routes.verify.POST, '/api/verify', { email, code }) };
}

async function startLogin(email: string) {
  const res = await call(routes.login.POST, '/api/login', { email, password: PASSWORD });
  return { res, code: res.status === 200 ? lastCodeSentTo(sendEmail, email) : undefined };
}

describe('POST /api/login/verify (Task 1: the login bypass)', () => {
  it('rejects a code when no login was started, without issuing a token', async () => {
    await (await signUp('ada@example.com')).verify();

    const res = await call(routes.loginVerify.POST, '/api/login/verify', {
      email: 'ada@example.com',
      code: '000000',
    });

    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  it('rejects a signup code', async () => {
    const { code } = await signUp('ada@example.com');

    const res = await call(routes.loginVerify.POST, '/api/login/verify', {
      email: 'ada@example.com',
      code,
    });
    expect(res.status).toBe(400);
  });

  it('issues a working token after the password and the emailed code', async () => {
    await (await signUp('ada@example.com')).verify();
    const { code } = await startLogin('ada@example.com');

    const res = await call(routes.loginVerify.POST, '/api/login/verify', {
      email: 'ada@example.com',
      code,
    });
    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.token, JWT_SECRET)).toMatchObject({ email: 'ada@example.com' });

    const profile = await routes.profile.GET(
      request('/api/user/profile', { method: 'GET', token: res.body.token }),
    );
    expect(profile.status).toBe(200);
  });

  it('accepts each code only once', async () => {
    await (await signUp('ada@example.com')).verify();
    const { code } = await startLogin('ada@example.com');
    const body = { email: 'ada@example.com', code };

    expect((await call(routes.loginVerify.POST, '/api/login/verify', body)).status).toBe(200);
    expect((await call(routes.loginVerify.POST, '/api/login/verify', body)).status).toBe(400);
  });

  it('refuses a wrong password before any code is sent', async () => {
    await (await signUp('ada@example.com')).verify();
    sendEmail.mockClear();

    const res = await call(routes.login.POST, '/api/login', {
      email: 'ada@example.com',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('POST /api/login: lockout', () => {
  it('locks the email after 5 wrong passwords, saying how long to wait', async () => {
    await (await signUp('ada@example.com')).verify();
    const login = (password: string) =>
      routes.login.POST(request('/api/login', { body: { email: 'ada@example.com', password } }));

    for (let i = 0; i < 5; i++) {
      const res = await login('Wrong-passw0rd');
      expect(await res.json()).toEqual({
        error: { code: 'invalid_credentials', message: 'Invalid email or password' },
      });
    }

    // Even the right password is refused while the lock lasts
    const locked = await login(PASSWORD);
    expect(locked.status).toBe(429);
    expect(locked.headers.get('Retry-After')).toBe('1800');
    expect(await locked.json()).toEqual({
      error: {
        code: 'too_many_attempts',
        message: 'Too many failed attempts. Please try again in 30 minutes.',
        details: { retryAfterMinutes: 30 },
      },
    });
  });

  it('warns, rather than fails, when the account is not verified yet', async () => {
    await signUp('ada@example.com');
    const res = await call(routes.login.POST, '/api/login', {
      email: 'ada@example.com',
      password: PASSWORD,
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('email_not_verified');
  });
});

describe('POST /api/resend-code (Tasks 1-2)', () => {
  it('never issues login codes, which need the password', async () => {
    await (await signUp('ada@example.com')).verify();

    const res = await call(routes.resendCode.POST, '/api/resend-code', {
      email: 'ada@example.com',
      type: 'login',
    });
    expect(res.status).toBe(400);
  });

  it("refuses verified accounts, so it can't replace a pending login code", async () => {
    await (await signUp('ada@example.com')).verify();
    const { code } = await startLogin('ada@example.com');

    const resend = await call(routes.resendCode.POST, '/api/resend-code', {
      email: 'ada@example.com',
      type: 'signup',
    });
    expect(resend).toEqual({
      status: 400,
      body: {
        error: { code: 'already_verified', message: 'Account already verified. Please log in.' },
      },
    });

    const login = await call(routes.loginVerify.POST, '/api/login/verify', {
      email: 'ada@example.com',
      code,
    });
    expect(login.status).toBe(200);
  });

  it('sends a new code that verifies an unverified account', async () => {
    await signUp('ada@example.com');

    const res = await call(routes.resendCode.POST, '/api/resend-code', {
      email: 'ada@example.com',
      type: 'signup',
    });
    expect(res.status).toBe(200);

    const code = lastCodeSentTo(sendEmail, 'ada@example.com');
    const verify = await call(routes.verify.POST, '/api/verify', {
      email: 'ada@example.com',
      code,
    });
    expect(verify.status).toBe(200);
  });
});

describe('guessing codes (Task 2)', () => {
  it('burns the code on the 5th wrong guess', async () => {
    await (await signUp('ada@example.com')).verify();
    const { code } = await startLogin('ada@example.com');
    const guess = (c: string) =>
      call(routes.loginVerify.POST, '/api/login/verify', { email: 'ada@example.com', code: c });

    for (let i = 0; i < 4; i++) expect((await guess('000000')).body.message).toBe('Invalid code');
    expect((await guess('000000')).body.message).toBe(
      'Too many incorrect attempts. Please request a new code.',
    );
    expect((await guess(code!)).status).toBe(400);
  });
});

describe('tokens (Task 3)', () => {
  it.each(['dev-secret', 'your-secret-key-change-in-production'])(
    'rejects tokens signed with the old fallback secret %j',
    async (oldSecret) => {
      await (await signUp('ada@example.com')).verify();
      const forged = jwt.sign({ email: 'ada@example.com' }, oldSecret);

      const res = await routes.profile.GET(
        request('/api/user/profile', { method: 'GET', token: forged }),
      );
      expect(res.status).toBe(401);
    },
  );

  it("fails without JWT_SECRET, but doesn't use up the user's code", async () => {
    await (await signUp('ada@example.com')).verify();
    const { code } = await startLogin('ada@example.com');
    const body = { email: 'ada@example.com', code };

    vi.stubEnv('JWT_SECRET', undefined);
    expect((await call(routes.loginVerify.POST, '/api/login/verify', body)).status).toBe(500);

    vi.stubEnv('JWT_SECRET', JWT_SECRET);
    expect((await call(routes.loginVerify.POST, '/api/login/verify', body)).status).toBe(200);
  });
});

describe('emails (Task 9)', () => {
  it('escapes the name in the verification email', async () => {
    await signUp('ada@example.com', '<img src=x onerror=alert(1)> Ada');

    const html = sendEmail.mock.calls[0][0].html as string;
    expect(html).toContain('Hi &lt;img src=x onerror=alert(1)&gt; Ada!');
    expect(html).not.toContain('<img');
  });

  it('tells the user when a code could not be sent in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    sendEmail.mockResolvedValue(false);

    const signup = await call(routes.signup.POST, '/api/signup', {
      fullName: 'Ada',
      email: 'ada@example.com',
      password: PASSWORD,
    });
    expect(signup.status).toBe(201);
    expect(signup.body.codeSent).toBe(false);
    expect(signup.body.message).toContain("couldn't send the verification email");

    const resend = await call(routes.resendCode.POST, '/api/resend-code', {
      email: 'ada@example.com',
      type: 'signup',
    });
    expect(resend.status).toBe(502);
  });
});
