import { describe, expect, it } from 'vitest';
import { adherenceQuerySchema } from './adherence';

const check = (input: unknown) => {
  const result = adherenceQuerySchema.safeParse(input);
  return result.success ? result.data.days : result.error.issues[0].message;
};

describe('adherenceQuerySchema', () => {
  it('covers a week unless told otherwise, up to a year', () => {
    expect(check({})).toBe(7);
    expect(check({ days: '' })).toBe(7);
    expect(check({ days: '30' })).toBe(30);
    expect(check({ days: '365' })).toBe(365);
  });

  it('refuses anything that is not a whole number of days in range', () => {
    for (const days of ['0', '366', '7.5', 'week', '-1']) {
      expect(check({ days })).toBe('Ask for between 1 and 365 days');
    }
  });
});
