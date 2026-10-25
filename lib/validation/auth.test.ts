import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  codeSchema,
  loginSchema,
  phoneStartSchema,
  phoneVerifySchema,
  resendCodeSchema,
  signupSchema,
} from './auth';

// The first problem's message, or 'ok'
const check = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? 'ok' : result.error.issues[0].message;
};

const signup = { fullName: 'Ada Obi', email: 'ada@example.com', password: 'Passw0rdOk' };

describe('signupSchema', () => {
  it('accepts a valid sign-up and tidies the email and name', () => {
    expect(
      signupSchema.parse({ ...signup, fullName: '  Ada Obi ', email: ' Ada@Example.COM ' }),
    ).toEqual(signup);
  });

  it('applies the same password rules as the sign-up form', () => {
    const password = (value: string) => check(signupSchema, { ...signup, password: value });
    expect(password('Sh0rt')).toBe('Your password must be at least 8 characters');
    expect(password('passw0rdok')).toBe('Your password must include an uppercase letter');
    expect(password('PASSW0RDOK')).toBe('Your password must include a lowercase letter');
    expect(password('PasswordOk')).toBe('Your password must include a number');
    expect(password(`Aa1${'x'.repeat(126)}`)).toBe('Your password must be 128 characters or fewer');
  });

  it('needs a real name and email', () => {
    expect(check(signupSchema, { ...signup, fullName: ' A ' })).toBe(
      'Your name must be at least 2 characters',
    );
    expect(check(signupSchema, { ...signup, fullName: undefined })).toBe('Enter your full name');
    expect(check(signupSchema, { ...signup, email: 'ada@' })).toBe('Enter a valid email address');
    expect(check(signupSchema, { ...signup, email: 42 })).toBe('Enter your email address');
  });

  it('keeps names with markup as text (emails escape them)', () => {
    expect(check(signupSchema, { ...signup, fullName: '<b>Ada</b>' })).toBe('ok');
  });
});

describe('loginSchema', () => {
  it('accepts any non-empty password, so older accounts can still log in', () => {
    expect(check(loginSchema, { email: 'ada@example.com', password: 'wrong' })).toBe('ok');
    expect(check(loginSchema, { email: 'ada@example.com', password: '' })).toBe(
      'Enter your password',
    );
  });
});

describe('codeSchema', () => {
  it('accepts exactly six digits', () => {
    expect(codeSchema.parse({ email: 'ada@example.com', code: ' 012345 ' }).code).toBe('012345');
    for (const code of ['12345', '1234567', 'abcdef', 123456]) {
      expect(check(codeSchema, { email: 'ada@example.com', code })).toBe('Enter the 6-digit code');
    }
  });
});

describe('resendCodeSchema', () => {
  it('only resends signup codes', () => {
    expect(check(resendCodeSchema, { email: 'ada@example.com' })).toBe('ok');
    expect(check(resendCodeSchema, { email: 'ada@example.com', type: 'signup' })).toBe('ok');
    expect(check(resendCodeSchema, { email: 'ada@example.com', type: 'login' })).toBe(
      'Invalid code type',
    );
  });
});

describe('phoneStartSchema', () => {
  it('needs a name to sign up, but not to log in', () => {
    expect(
      phoneStartSchema.parse({ mode: 'sign_up', phone: ' +2348031234567 ', fullName: ' Ada Obi ' }),
    ).toEqual({ mode: 'sign_up', phone: '+2348031234567', fullName: 'Ada Obi' });
    expect(check(phoneStartSchema, { mode: 'sign_up', phone: '+2348031234567' })).toBe(
      'Enter your full name',
    );
    expect(
      phoneStartSchema.parse({ mode: 'log_in', phone: '+2348031234567', fullName: 'x' }),
    ).toEqual({ mode: 'log_in', phone: '+2348031234567' });
  });

  it('reads the number however it is typed, and stores it in E.164', () => {
    expect(phoneStartSchema.parse({ mode: 'log_in', phone: '0803 123 4567' })).toEqual({
      mode: 'log_in',
      phone: '+2348031234567',
    });
  });

  it('refuses numbers that cannot receive SMS', () => {
    expect(check(phoneStartSchema, { mode: 'log_in', phone: '0800 000 0001' })).toBe(
      'Enter a valid Nigerian mobile number, e.g. 0803 123 4567',
    );
    expect(check(phoneStartSchema, { mode: 'log_in', phone: 42 })).toBe('Enter your phone number');
  });

  it('needs to know which it is', () => {
    expect(check(phoneStartSchema, { phone: '+2348031234567' })).toBe(
      'Say whether this is a sign-up or a log-in',
    );
  });
});

describe('phoneVerifySchema', () => {
  it('needs the number and the 6-digit code', () => {
    expect(phoneVerifySchema.parse({ phone: '+2348031234567', code: '123456' })).toEqual({
      phone: '+2348031234567',
      code: '123456',
    });
    expect(check(phoneVerifySchema, { phone: '+2348031234567', code: '12345' })).toBe(
      'Enter the 6-digit code',
    );
  });
});
