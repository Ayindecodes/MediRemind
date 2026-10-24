import { describe, expect, it } from 'vitest';
import { errorFrom } from './apiClient';

describe('errorFrom', () => {
  it('reads the code, message and details of an API error', () => {
    const body = {
      error: { code: 'too_many_attempts', message: 'Try again later', details: { minutes: 30 } },
    };
    expect(errorFrom(body, 'Fallback')).toEqual(body.error);
  });

  it('uses the fallback for anything else', () => {
    for (const body of [
      null,
      'Bad Gateway',
      {},
      { error: 'Unauthorized' },
      { error: { code: 1 } },
    ]) {
      expect(errorFrom(body, 'Fallback')).toEqual({ code: 'unknown', message: 'Fallback' });
    }
  });
});
