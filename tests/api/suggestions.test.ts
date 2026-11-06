import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/medications/suggestions/route';

const get = async (query: string) => {
  const response = await GET(
    new NextRequest(`http://localhost/api/medications/suggestions${query}`),
  );
  return { status: response.status, headers: response.headers, body: await response.json() };
};

describe('GET /api/medications/suggestions', () => {
  it('suggests medicines for what was typed, without needing a sign-in', async () => {
    const { status, headers, body } = await get('?q=lonart');
    expect(status).toBe(200);
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0]).toMatchObject({
      name: 'Artemether and lumefantrine',
      match: { on: 'brand', text: 'Lonart' },
    });
    expect(headers.get('Cache-Control')).toContain('public');
  });

  it('gives as many as asked, and nothing for nothing', async () => {
    expect((await get('?q=a&limit=3')).body.suggestions).toHaveLength(3);
    expect((await get('')).body).toEqual({ suggestions: [] });
  });

  it('refuses a count out of range', async () => {
    expect(await get('?q=a&limit=50').then((r) => r.body)).toEqual({
      error: { code: 'invalid_request', message: 'Ask for between 1 and 20 suggestions' },
    });
  });
});
