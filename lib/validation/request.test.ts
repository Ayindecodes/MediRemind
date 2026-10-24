import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { blankToNull, blankToUndefined, parseJsonBody } from './request';

const schema = z.object({
  name: z.string({ error: 'Enter a name' }).trim().min(1, 'Enter a name'),
});

const post = (body: string) =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

describe('parseJsonBody', () => {
  it('returns the checked data, without fields the schema does not list', async () => {
    const result = await parseJsonBody(post('{"name":" Ada ","userId":"someone-else"}'), schema);
    expect(result).toEqual({ ok: true, data: { name: 'Ada' } });
  });

  it('returns the first problem as a readable message', async () => {
    expect(await parseJsonBody(post('{"name":"   "}'), schema)).toEqual({
      ok: false,
      error: 'Enter a name',
    });
    expect(await parseJsonBody(post('{}'), schema)).toEqual({ ok: false, error: 'Enter a name' });
  });

  it('rejects a body that is not JSON', async () => {
    expect(await parseJsonBody(post('name=Ada'), schema)).toEqual({
      ok: false,
      error: 'The request body must be valid JSON',
    });
  });

  it('rejects JSON that is not an object', async () => {
    for (const body of ['null', '[]', '"Ada"', '42']) {
      expect(await parseJsonBody(post(body), schema)).toEqual({
        ok: false,
        error: 'The request body must be a JSON object',
      });
    }
  });
});

describe('blank values', () => {
  it('treats empty and whitespace-only strings as not given', () => {
    expect(blankToUndefined('')).toBeUndefined();
    expect(blankToUndefined('  ')).toBeUndefined();
    expect(blankToUndefined('x')).toBe('x');
    expect(blankToUndefined(0)).toBe(0);
  });

  it('turns empty strings and null into null, meaning "clear the field"', () => {
    expect(blankToNull('')).toBeNull();
    expect(blankToNull(' ')).toBeNull();
    expect(blankToNull(null)).toBeNull();
    expect(blankToNull(undefined)).toBeUndefined();
    expect(blankToNull('2026-10-01')).toBe('2026-10-01');
  });
});
