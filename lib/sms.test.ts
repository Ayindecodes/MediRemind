import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendSms } from './sms';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.stubEnv('TERMII_API_KEY', 'termii-key');
  vi.stubEnv('TERMII_BASE_URL', 'https://termii.example/');
  vi.stubEnv('TERMII_SENDER_ID', 'MediRemind');
  vi.stubEnv('TERMII_CHANNEL', undefined);
});
afterEach(() => vi.unstubAllGlobals());

const sms = { to: '+2348031234567', message: 'Your MediRemind code is 123456' };

describe('sendSms', () => {
  it('sends through Termii on the DND channel, to the number without its +', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"Successfully Sent"}', { status: 200 }));

    expect(await sendSms(sms)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://termii.example/api/sms/send');
    expect(JSON.parse(init.body)).toEqual({
      api_key: 'termii-key',
      to: '2348031234567',
      from: 'MediRemind',
      sms: 'Your MediRemind code is 123456',
      type: 'plain',
      channel: 'dnd',
    });
  });

  it("reports Termii's refusal without logging the message", async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      new Response('{"message":"Insufficient balance"}', { status: 400 }),
    );

    expect(await sendSms(sms)).toBe(false);
    expect(log.mock.calls[0][0]).toContain('Insufficient balance');
    expect(JSON.stringify(log.mock.calls)).not.toContain('123456');
  });

  it('never throws when Termii cannot be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await sendSms(sms)).toBe(false);
  });

  it('prints the message in development when there is no Termii key', async () => {
    vi.stubEnv('TERMII_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(await sendSms(sms)).toBe(true);
    expect(log.mock.calls[0][0]).toContain('Your MediRemind code is 123456');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses in production when there is no Termii key', async () => {
    vi.stubEnv('TERMII_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendSms(sms)).toBe(false);
  });

  it('refuses with a clear reason when Termii is half set up', async () => {
    vi.stubEnv('TERMII_SENDER_ID', '');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendSms(sms)).toBe(false);
    expect(log.mock.calls[0][1]).toContain('TERMII_SENDER_ID is not set');
  });
});
