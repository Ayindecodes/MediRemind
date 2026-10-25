// lib/phone.ts
// Phone numbers as people type them, turned into the E.164 form (+2348031234567) that Supabase Auth
// and the database use.
import { parsePhoneNumberFromString } from 'libphonenumber-js/mobile';

export type MobileNumber = { ok: true; phone: string } | { ok: false; error: string };

/**
 * Reads a mobile number typed in any common form. Without a country code it's taken as Nigerian
 * (0803 123 4567, 803…, 234803…); with one, any country's mobile works, for family abroad. Only
 * numbers that can receive SMS count, since sign-in codes go by SMS: landlines and toll-free numbers
 * are refused.
 */
export function readMobileNumber(input: string): MobileNumber {
  const typed = input.trim();
  const number = parsePhoneNumberFromString(typed, 'NG');
  if (number?.isValid()) return { ok: true, phone: number.number };

  const foreign = typed.startsWith('+') && !typed.replace(/[\s()-]/g, '').startsWith('+234');
  return {
    ok: false,
    error: foreign
      ? "That number doesn't look right. Check the country code and the mobile number."
      : 'Enter a valid Nigerian mobile number, e.g. 0803 123 4567',
  };
}

// A stored number written the way people read it, e.g. +234 803 123 4567
export function displayPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
