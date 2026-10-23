// lib/email.ts
import { Resend } from 'resend';

const FROM = 'MediRemind <onboarding@resend.dev>';

let resend: Resend | null = null;

// Created on first use so `next build` doesn't need RESEND_API_KEY
function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set. Add it to .env.local (get one at https://resend.com/api-keys)');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

// Escape user-provided text before putting it into email HTML
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Returns whether the email was accepted. Resend reports API failures in its result
// instead of throwing, so both paths are checked. Never throws.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  try {
    const { error } = await getResend().emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`Email sending failed (${error.name}): ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Email sending failed:', err);
    return false;
  }
}
