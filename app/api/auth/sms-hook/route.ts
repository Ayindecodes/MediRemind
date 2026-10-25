// app/api/auth/sms-hook/route.ts
// Supabase Auth's "Send SMS" hook. Supabase makes each sign-in code and calls this route to deliver
// it, and the route sends it by SMS through Termii. Set up in supabase/config.toml locally, and in
// the dashboard (Authentication → Hooks) for the hosted project.
import { z } from 'zod';
import { signInCodeSms } from '@/lib/auth/messages';
import { getAppUrl, getSmsHookSecret } from '@/lib/env';
import { sendSms } from '@/lib/sms';
import { verifyWebhook } from '@/lib/webhooks';

const hookCall = z.object({
  user: z.object({ phone: z.string() }),
  sms: z.object({ otp: z.string().regex(/^\d{4,10}$/), phone: z.string().optional() }),
});

// Supabase expects errors in this shape, and shows the message to the person signing in
const hookError = (status: number, message: string) =>
  Response.json({ error: { http_code: status, message } }, { status });

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (!verifyWebhook(getSmsHookSecret(), request.headers, body)) {
      return hookError(401, 'This request was not signed by Supabase.');
    }

    const call = hookCall.safeParse(JSON.parse(body));
    if (!call.success) return hookError(400, 'The hook call is missing the phone number or code.');
    const { user, sms } = call.data;

    // Auth gives numbers without the +
    const to = `+${(sms.phone || user.phone).replace(/^\+/, '')}`;
    const sent = await sendSms({ to, message: signInCodeSms(sms.otp, getAppUrl()) });
    if (!sent) {
      return hookError(502, "We couldn't send your code by SMS. Please try again in a moment.");
    }
    return Response.json({});
  } catch (error) {
    console.error('SMS hook failed:', error);
    return hookError(500, "We couldn't send your code. Please try again later.");
  }
}
