// Signing up, logging in and out by phone, through the real routes and the local Supabase Auth. The
// test numbers (supabase/config.toml) always take the code 123456 and send no SMS.
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as me } from '@/app/api/auth/me/route';
import { POST as start } from '@/app/api/auth/phone/start/route';
import { POST as verify } from '@/app/api/auth/phone/verify/route';
import { POST as signOut } from '@/app/api/auth/sign-out/route';
import { dbAsServer } from '@/lib/db/client';

const ADA = '+2348000000001';
const BOLA = '+2348000000002';
const NOBODY = '+2348000000003';
const CODE = '123456';

// Deletes any account on a test number, including ones left by an earlier run
async function removeTestAccounts() {
  const server = dbAsServer();
  const { data } = await server.auth.admin.listUsers();
  for (const user of data.users) {
    if (user.phone?.startsWith('23480000000')) await server.auth.admin.deleteUser(user.id);
  }
}

beforeAll(async () => {
  await removeTestAccounts();
  // Bola already has an account
  const { error } = await dbAsServer().auth.admin.createUser({
    phone: BOLA,
    phone_confirm: true,
    user_metadata: { full_name: 'Bola Ade' },
  });
  if (error) throw error;
});
afterAll(removeTestAccounts);

type Handler = (request: NextRequest) => Promise<Response>;

const send = (handler: Handler, body?: unknown, cookies = '') =>
  handler(
    new NextRequest('http://localhost/api/auth', {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookies && { Cookie: cookies }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

// The cookies a response sets, as a browser would send them back
const cookiesFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .filter((pair) => !pair.endsWith('='))
    .join('; ');

const json = async (response: Response) => ({
  status: response.status,
  body: await response.json(),
});

describe('signing up by phone', () => {
  let session = '';

  it('sends a code, then the code starts a session in httpOnly cookies', async () => {
    expect(
      await json(await send(start, { mode: 'sign_up', phone: ADA, fullName: 'Ada Obi' })),
    ).toEqual({ status: 200, body: { codeSent: true } });

    const verified = await send(verify, { phone: ADA, code: CODE });
    expect(verified.status).toBe(200);
    expect((await verified.json()).profile).toMatchObject({
      full_name: 'Ada Obi',
      phone: ADA,
      plan: 'free',
      timezone: 'Africa/Lagos',
    });

    const setCookies = verified.headers.getSetCookie();
    expect(setCookies.length).toBeGreaterThan(0);
    for (const cookie of setCookies) {
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=lax/i);
      expect(cookie).toMatch(/Path=\//);
    }
    session = cookiesFrom(verified);
  });

  it('the session identifies the person on later requests', async () => {
    expect(await json(await send(me, undefined, session))).toMatchObject({
      status: 200,
      body: { profile: { full_name: 'Ada Obi', phone: ADA } },
    });
    expect(await json(await send(me))).toEqual({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'Please log in to continue.' } },
    });
  });

  it('allows one code a minute per number', async () => {
    const again = await json(await send(start, { mode: 'log_in', phone: ADA }));
    expect(again.status).toBe(429);
    expect(again.body.error.code).toBe('too_many_attempts');
    expect(again.body.error.message).toMatch(
      /^Please wait \d+ seconds before asking for another code\.$/,
    );
  });

  it('signing out ends the session for good, even if the old cookies are sent again', async () => {
    const out = await send(signOut, {}, session);
    expect(out.status).toBe(200);
    // The cookies are cleared
    expect(out.headers.getSetCookie().every((cookie) => /Max-Age=0|=;/.test(cookie))).toBe(true);
    // And the old ones no longer work
    expect((await send(me, undefined, session)).status).toBe(401);
  });

  it('needs a name and an international number', async () => {
    expect(await json(await send(start, { mode: 'sign_up', phone: '+2348000000004' }))).toEqual({
      status: 400,
      body: { error: { code: 'invalid_request', message: 'Enter your full name' } },
    });
    const local = await json(await send(start, { mode: 'log_in', phone: '08031234567' }));
    expect(local.body.error.code).toBe('invalid_request');
  });
});

describe('logging in by phone', () => {
  it('refuses a wrong code, then accepts the right one', async () => {
    expect((await send(start, { mode: 'log_in', phone: BOLA })).status).toBe(200);

    expect(await json(await send(verify, { phone: BOLA, code: '000000' }))).toEqual({
      status: 400,
      body: {
        error: {
          code: 'invalid_code',
          message: 'That code is wrong or has expired. Check it, or ask for a new one.',
        },
      },
    });

    const verified = await json(await send(verify, { phone: BOLA, code: CODE }));
    expect(verified).toMatchObject({ status: 200, body: { profile: { full_name: 'Bola Ade' } } });
  });

  it("doesn't create an account for a number that has none", async () => {
    expect(await json(await send(start, { mode: 'log_in', phone: NOBODY }))).toEqual({
      status: 404,
      body: {
        error: { code: 'not_found', message: 'No account uses this number. Check it, or sign up.' },
      },
    });
    const { data } = await dbAsServer().auth.admin.listUsers();
    expect(data.users.some((user) => user.phone === NOBODY.slice(1))).toBe(false);
  });
});
