// The SMS hook Supabase Auth calls to deliver sign-in codes
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import realCall from '@/tests/fixtures/supabase-sms-hook.json';

const { sendSms } = vi.hoisted(() => ({ sendSms: vi.fn() }));
vi.mock('@/lib/sms', () => ({ sendSms }));

const { POST } = await import('@/app/api/auth/sms-hook/route');

const sentAt = Number(realCall.headers['webhook-timestamp']) * 1000;
const realCode = JSON.parse(realCall.body).sms.otp as string;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(sentAt);
  vi.stubEnv('SMS_HOOK_SECRET', realCall.secret);
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://mediremind.ng');
  sendSms.mockReset();
  sendSms.mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());

const call = (headers: Record<string, string>, body: string) =>
  POST(new Request('http://localhost/api/auth/sms-hook', { method: 'POST', headers, body }));

const json = async (res: Response) => ({ status: res.status, body: await res.json() });

describe('POST /api/auth/sms-hook', () => {
  it("sends the code from Supabase's real call to the number, with + added", async () => {
    expect(await json(await call(realCall.headers, realCall.body))).toEqual({
      status: 200,
      body: {},
    });
    expect(sendSms).toHaveBeenCalledWith({
      to: '+2348035550123',
      message: `Your MediRemind code is ${realCode}. Don't share it with anyone.\n\n@mediremind.ng #${realCode}`,
    });
  });

  it('refuses a call that Supabase did not sign, without sending anything', async () => {
    const forged = realCall.body.replace('2348035550123', '2348039999999');
    expect(await json(await call(realCall.headers, forged))).toEqual({
      status: 401,
      body: { error: { http_code: 401, message: 'This request was not signed by Supabase.' } },
    });
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('refuses a real call replayed later', async () => {
    vi.setSystemTime(sentAt + 10 * 60_000);
    expect((await call(realCall.headers, realCall.body)).status).toBe(401);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('tells Supabase when the SMS could not be sent, so the person sees why', async () => {
    sendSms.mockResolvedValue(false);
    expect(await json(await call(realCall.headers, realCall.body))).toEqual({
      status: 502,
      body: {
        error: {
          http_code: 502,
          message: "We couldn't send your code by SMS. Please try again in a moment.",
        },
      },
    });
  });

  it('refuses a signed call without a code', async () => {
    const key = Buffer.from(realCall.secret.replace('v1,whsec_', ''), 'base64');
    const body = JSON.stringify({ user: { phone: '2348031234567' }, sms: {} });
    const timestamp = String(sentAt / 1000);
    const signature = createHmac('sha256', key)
      .update(`msg_2.${timestamp}.${body}`)
      .digest('base64');
    const res = await call(
      {
        'webhook-id': 'msg_2',
        'webhook-timestamp': timestamp,
        'webhook-signature': `v1,${signature}`,
      },
      body,
    );
    expect(res.status).toBe(400);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('fails safely when the server has no hook secret', async () => {
    vi.stubEnv('SMS_HOOK_SECRET', undefined);
    expect((await call(realCall.headers, realCall.body)).status).toBe(500);
    expect(sendSms).not.toHaveBeenCalled();
  });
});
