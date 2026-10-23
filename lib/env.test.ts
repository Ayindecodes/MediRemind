import { describe, expect, it, vi } from 'vitest';
import { checkServerEnv, getAppUrl, getCronSecret, getJwtSecret } from './env';

const STRONG = 'x'.repeat(32);

describe.each([
  ['JWT_SECRET', getJwtSecret],
  ['CRON_SECRET', getCronSecret],
] as const)('%s', (name, getSecret) => {
  it('is required', () => {
    vi.stubEnv(name, undefined);
    expect(getSecret).toThrow(`${name} is not set`);
  });

  it('treats an empty value as not set', () => {
    vi.stubEnv(name, '');
    expect(getSecret).toThrow(`${name} is not set`);
  });

  it('must be at least 32 characters', () => {
    vi.stubEnv(name, 'x'.repeat(31));
    expect(getSecret).toThrow(`${name} must be at least 32 characters`);
  });

  it('returns a strong secret', () => {
    vi.stubEnv(name, STRONG);
    expect(getSecret()).toBe(STRONG);
  });
});

describe('getAppUrl', () => {
  it('defaults to the local dev server', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined);
    expect(getAppUrl()).toBe('http://localhost:3000');
  });

  it('trims trailing slashes so links never get a double slash', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://mediremind.ng//');
    expect(getAppUrl()).toBe('https://mediremind.ng');
  });

  it('rejects a bare domain, which would produce broken links', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'mediremind.ng');
    expect(getAppUrl).toThrow('NEXT_PUBLIC_APP_URL must be a full URL');
  });
});

describe('checkServerEnv', () => {
  const stubAll = (env: Record<string, string | undefined>) => {
    for (const name of ['JWT_SECRET', 'CRON_SECRET', 'RESEND_API_KEY', 'NEXT_PUBLIC_APP_URL']) {
      vi.stubEnv(name, env[name]);
    }
  };

  it('lists every problem at once', () => {
    stubAll({ JWT_SECRET: 'short', CRON_SECRET: 'tiny', NEXT_PUBLIC_APP_URL: 'mediremind.ng' });

    expect(checkServerEnv).toThrow(
      [
        'Invalid environment configuration:',
        '  - JWT_SECRET must be at least 32 characters',
        '  - CRON_SECRET must be at least 32 characters',
        '  - NEXT_PUBLIC_APP_URL must be a full URL, e.g. https://mediremind.ng',
      ].join('\n'),
    );
  });

  it('only needs JWT_SECRET in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    stubAll({ JWT_SECRET: STRONG });
    expect(checkServerEnv()).toEqual([]);
  });

  it('warns in production when emails cannot be sent or would link to localhost', () => {
    vi.stubEnv('NODE_ENV', 'production');
    stubAll({ JWT_SECRET: STRONG });

    const warnings = checkServerEnv();
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatch(/^RESEND_API_KEY is not set/);
    expect(warnings[1]).toMatch(/^NEXT_PUBLIC_APP_URL is not set/);
  });

  it('has no warnings in production when everything is set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    stubAll({
      JWT_SECRET: STRONG,
      CRON_SECRET: STRONG,
      RESEND_API_KEY: 're_test',
      NEXT_PUBLIC_APP_URL: 'https://mediremind.ng',
    });
    expect(checkServerEnv()).toEqual([]);
  });
});
