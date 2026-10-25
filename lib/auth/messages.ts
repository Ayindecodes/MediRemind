// lib/auth/messages.ts
// The words people receive when they sign in.

/**
 * The SMS carrying a sign-in code. On a real domain it ends with the line Android Chrome reads to
 * fill the code in by itself (the WebOTP format, '@<domain> #<code>'). It stays within one SMS
 * (160 characters), since each part is billed separately.
 */
export function signInCodeSms(code: string, appUrl: string): string {
  const message = `Your MediRemind code is ${code}. Don't share it with anyone.`;
  const host = new URL(appUrl).hostname;
  if (host === 'localhost' || host === '127.0.0.1') return message;
  return `${message}\n\n@${host} #${code}`;
}
