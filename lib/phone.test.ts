import { describe, expect, it } from 'vitest';
import { displayPhone, readMobileNumber } from './phone';

const nigerian = 'Enter a valid Nigerian mobile number, e.g. 0803 123 4567';

describe('readMobileNumber', () => {
  it('reads a Nigerian mobile number however it is typed', () => {
    for (const typed of [
      '08031234567',
      '0803 123 4567',
      '0803-123-4567',
      '8031234567',
      '2348031234567',
      '+2348031234567',
      '+234 803 123 4567',
      '+234 (0) 803 123 4567',
      '+2340803 123 4567',
      '  08031234567  ',
    ]) {
      expect(readMobileNumber(typed), typed).toEqual({ ok: true, phone: '+2348031234567' });
    }
  });

  it('knows the other Nigerian mobile ranges', () => {
    expect(readMobileNumber('07012345678')).toEqual({ ok: true, phone: '+2347012345678' });
    expect(readMobileNumber('09012345678')).toEqual({ ok: true, phone: '+2349012345678' });
    expect(readMobileNumber('08121234567')).toEqual({ ok: true, phone: '+2348121234567' });
  });

  it('refuses numbers that are too short, landlines and toll-free numbers, which get no SMS', () => {
    for (const typed of ['0803123456', '012345678', '08000000001', 'hello', '']) {
      expect(readMobileNumber(typed), typed).toEqual({ ok: false, error: nigerian });
    }
  });

  it('accepts a mobile number from another country when it has its code, for family abroad', () => {
    expect(readMobileNumber('+44 7911 123456')).toEqual({ ok: true, phone: '+447911123456' });
    expect(readMobileNumber('+1 415 555 0123')).toEqual({ ok: true, phone: '+14155550123' });
  });

  it('explains a foreign number that is not a mobile', () => {
    expect(readMobileNumber('+44 20 7946 0000')).toEqual({
      ok: false,
      error: "That number doesn't look right. Check the country code and the mobile number.",
    });
  });
});

describe('displayPhone', () => {
  it('writes a stored number the way people read it', () => {
    expect(displayPhone('+2348031234567')).toBe('+234 803 123 4567');
    expect(displayPhone('+447911123456')).toBe('+44 7911 123456');
  });
});
