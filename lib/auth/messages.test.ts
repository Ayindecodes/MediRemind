import { describe, expect, it } from 'vitest';
import { signInCodeSms } from './messages';

describe('signInCodeSms', () => {
  it('ends with the line Android uses to fill in the code, on a real domain', () => {
    expect(signInCodeSms('123456', 'https://mediremind.ng')).toBe(
      "Your MediRemind code is 123456. Don't share it with anyone.\n\n@mediremind.ng #123456",
    );
  });

  it('leaves that line out for a local server', () => {
    expect(signInCodeSms('123456', 'http://localhost:3000')).toBe(
      "Your MediRemind code is 123456. Don't share it with anyone.",
    );
  });

  it('fits in one SMS', () => {
    expect(signInCodeSms('123456', 'https://app.mediremind.ng').length).toBeLessThanOrEqual(160);
  });
});
