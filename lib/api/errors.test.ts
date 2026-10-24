import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiError, handleErrors } from './errors';

afterEach(() => vi.restoreAllMocks());

const body = async (res: Response) => ({ status: res.status, body: await res.json() });

describe('apiError', () => {
  it('sends the code and message with the status that belongs to the code', async () => {
    expect(await body(apiError('not_found', 'Medication not found'))).toEqual({
      status: 404,
      body: { error: { code: 'not_found', message: 'Medication not found' } },
    });
    expect((await body(apiError('upgrade_required', 'Upgrade'))).status).toBe(403);
    expect((await body(apiError('email_failed', 'Not sent'))).status).toBe(502);
  });

  it('adds details and headers when given', async () => {
    const res = apiError('too_many_attempts', 'Try again later', {
      details: { retryAfterMinutes: 30 },
      headers: { 'Retry-After': '1800' },
    });

    expect(res.headers.get('Retry-After')).toBe('1800');
    expect((await body(res)).body.error.details).toEqual({ retryAfterMinutes: 30 });
  });
});

describe('handleErrors', () => {
  const request = new Request('http://localhost/api/example', { method: 'POST' });

  it('passes the handler its arguments and returns its response', async () => {
    const handler = handleErrors(async (_request: Request, id: string) => Response.json({ id }));
    expect(await (await handler(request, 'med_1')).json()).toEqual({ id: 'med_1' });
  });

  it('turns a thrown error into a generic 500 and logs it', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = handleErrors(async (_request: Request) => {
      throw new Error('ENOENT: /srv/data/users.json');
    });

    const res = await body(await handler(request));
    expect(res).toEqual({
      status: 500,
      body: {
        error: {
          code: 'server_error',
          message: 'Something went wrong on our side. Please try again.',
        },
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('ENOENT');
    expect(log).toHaveBeenCalledWith('POST /api/example failed:', expect.any(Error));
  });
});
