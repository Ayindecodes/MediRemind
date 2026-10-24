// app/api/mood/log/route.ts
import { NextResponse } from 'next/server';
import { logMood } from '@/lib/userStorage';
import { apiError } from '@/lib/api/errors';
import { withUser } from '@/lib/api/withUser';
import { moodSchema } from '@/lib/validation/mood';
import { parseJsonBody } from '@/lib/validation/request';

export const POST = withUser(async (request, user) => {
  const input = await parseJsonBody(request, moodSchema);
  if (!input.ok) {
    return apiError('invalid_request', input.error);
  }
  const { mood, note } = input.data;

  return NextResponse.json({ success: true, mood: logMood(user.id, mood, note) });
});
