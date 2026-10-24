import { describe, expect, it } from 'vitest';
import { moodSchema } from './mood';

describe('moodSchema', () => {
  it("accepts the dashboard's request, dropping the empty note and the date", () => {
    expect(moodSchema.parse({ mood: 'happy', date: '2026-10-24T08:00:00.000Z', note: '' })).toEqual(
      { mood: 'happy' },
    );
  });

  it('only accepts the three moods', () => {
    const result = moodSchema.safeParse({ mood: 'ecstatic' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Choose how you are feeling');
  });

  it('limits the note', () => {
    expect(moodSchema.safeParse({ mood: 'sad', note: 'x'.repeat(501) }).success).toBe(false);
    expect(moodSchema.parse({ mood: 'sad', note: ' long day ' }).note).toBe('long day');
  });
});
