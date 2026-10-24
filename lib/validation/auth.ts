// lib/validation/auth.ts
// What the sign-up and login routes accept. The password rules match the sign-up form.
import { z } from 'zod';

// Trimmed and lowercased, since accounts are stored by lowercase email
export const emailAddress = z
  .string({ error: 'Enter your email address' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address' }).max(254, 'Enter a valid email address'));

const code = z
  .string({ error: 'Enter the 6-digit code' })
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

/** POST /api/signup */
export const signupSchema = z.object({
  fullName: z
    .string({ error: 'Enter your full name' })
    .trim()
    .min(2, 'Your name must be at least 2 characters')
    .max(100, 'Your name must be 100 characters or fewer'),
  email: emailAddress,
  password: z
    .string({ error: 'Choose a password' })
    .min(8, 'Your password must be at least 8 characters')
    .max(128, 'Your password must be 128 characters or fewer')
    .regex(/[a-z]/, 'Your password must include a lowercase letter')
    .regex(/[A-Z]/, 'Your password must include an uppercase letter')
    .regex(/\d/, 'Your password must include a number'),
});

/**
 * POST /api/login. Only checks that a password was sent: accounts created before the sign-up
 * rules existed must still be able to log in, and a wrong password is answered by the route.
 */
export const loginSchema = z.object({
  email: emailAddress,
  password: z
    .string({ error: 'Enter your password' })
    .min(1, 'Enter your password')
    .max(1024, 'That password is too long'),
});

/** POST /api/verify (signup code) and POST /api/login/verify (login code) */
export const codeSchema = z.object({ email: emailAddress, code });

/** POST /api/resend-code. Only signup codes can be resent; login codes need the password. */
export const resendCodeSchema = z.object({
  email: emailAddress,
  type: z.literal('signup', { error: 'Invalid code type' }).optional(),
});
