// lib/sms.ts
// Sends SMS through Termii (https://developers.termii.com).
import { getTermiiConfig } from '@/lib/env';

/**
 * Returns whether Termii accepted the message; never throws. Without TERMII_API_KEY, development
 * prints the message to the server log instead (so sign-in works locally) and production refuses.
 */
export async function sendSms({ to, message }: { to: string; message: string }): Promise<boolean> {
  let termii: ReturnType<typeof getTermiiConfig>;
  try {
    termii = getTermiiConfig();
  } catch (error) {
    console.error('SMS not sent:', error instanceof Error ? error.message : error);
    return false;
  }

  if (!termii) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📱 SMS to ${to} (TERMII_API_KEY isn't set, so it's printed here instead):\n${message}`,
      );
      return true;
    }
    console.error('SMS not sent: TERMII_API_KEY is not set');
    return false;
  }

  try {
    const response = await fetch(`${termii.baseUrl}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: termii.apiKey,
        // Termii wants the international number without the +
        to: to.replace(/^\+/, ''),
        from: termii.senderId,
        sms: message,
        type: 'plain',
        channel: termii.channel,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // Termii's reason, never the message itself: it can hold a sign-in code
      console.error(`SMS sending failed (${response.status}): ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
