import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import realCall from '@/tests/fixtures/supabase-sms-hook.json';
import { verifyWebhook } from './webhooks';

const sentAt = Number(realCall.headers['webhook-timestamp']) * 1000;
const headers = (overrides: Record<string, string> = {}) =>
  new Headers({ ...realCall.headers, ...overrides });

describe('verifyWebhook', () => {
  it('accepts a real call from Supabase Auth', () => {
    expect(verifyWebhook(realCall.secret, headers(), realCall.body, sentAt)).toBe(true);
  });

  it('rejects a call whose body was changed', () => {
    const changed = realCall.body.replace('2348035550123', '2348039999999');
    expect(verifyWebhook(realCall.secret, headers(), changed, sentAt)).toBe(false);
  });

  it('rejects a call signed with another secret', () => {
    const other = `v1,whsec_${Buffer.from('another secret entirely, 32 bytes').toString('base64')}`;
    expect(verifyWebhook(other, headers(), realCall.body, sentAt)).toBe(false);
  });

  it('rejects a call replayed more than five minutes later, or dated in the future', () => {
    expect(verifyWebhook(realCall.secret, headers(), realCall.body, sentAt + 4 * 60_000)).toBe(
      true,
    );
    expect(verifyWebhook(realCall.secret, headers(), realCall.body, sentAt + 6 * 60_000)).toBe(
      false,
    );
    expect(verifyWebhook(realCall.secret, headers(), realCall.body, sentAt - 6 * 60_000)).toBe(
      false,
    );
  });

  it('rejects a call with missing or malformed headers', () => {
    const missing = new Headers(realCall.headers);
    missing.delete('webhook-signature');
    expect(verifyWebhook(realCall.secret, missing, realCall.body, sentAt)).toBe(false);
    expect(
      verifyWebhook(
        realCall.secret,
        headers({ 'webhook-timestamp': 'soon' }),
        realCall.body,
        sentAt,
      ),
    ).toBe(false);
    expect(
      verifyWebhook(
        realCall.secret,
        headers({ 'webhook-signature': 'v2,abc' }),
        realCall.body,
        sentAt,
      ),
    ).toBe(false);
  });

  it('accepts a call when any of several signatures matches (secret rotation)', () => {
    const rotated = `v1,${Buffer.from('not it').toString('base64')} ${realCall.headers['webhook-signature']}`;
    expect(
      verifyWebhook(
        realCall.secret,
        headers({ 'webhook-signature': rotated }),
        realCall.body,
        sentAt,
      ),
    ).toBe(true);
  });

  it('matches the Standard Webhooks construction', () => {
    const key = Buffer.from('a local test key that is long enough');
    const secret = `v1,whsec_${key.toString('base64')}`;
    const signed = createHmac('sha256', key)
      .update('msg_1.1700000000.{"ok":true}')
      .digest('base64');
    const ok = new Headers({
      'webhook-id': 'msg_1',
      'webhook-timestamp': '1700000000',
      'webhook-signature': `v1,${signed}`,
    });
    expect(verifyWebhook(secret, ok, '{"ok":true}', 1_700_000_000_000)).toBe(true);
  });
});
