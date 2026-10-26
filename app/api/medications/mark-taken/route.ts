// app/api/medications/mark-taken/route.ts
import { NextResponse } from 'next/server';
import { markMedicationAsTaken } from '@/lib/userStorage';
import { apiError } from '@/lib/api/errors';
import { withUser } from '@/lib/api/withUser';
import { markTakenSchema } from '@/lib/validation/medication';
import { parseJsonBody } from '@/lib/validation/request';

export const POST = withUser(async (request, user) => {
  const input = await parseJsonBody(request, markTakenSchema);
  if (!input.ok) {
    return apiError('invalid_request', input.error);
  }
  const { medicationId } = input.data;

  // A dose ID is `<userId>_<medicationId>_<YYYY-MM-DD>_<HH:MM>`, and both IDs contain underscores
  // themselves, so take the person's ID off the front and the date and time off the end
  const dose = medicationId.startsWith(`${user.id}_`)
    ? medicationId.slice(user.id.length + 1).match(/^(.+)_\d{4}-\d{2}-\d{2}_(\d{2}:\d{2})$/)
    : null;
  if (!dose) {
    return apiError('invalid_request', "That isn't one of your doses.");
  }
  const [, actualMedId, scheduledTime] = dose;

  markMedicationAsTaken(user.id, actualMedId, scheduledTime);

  return NextResponse.json({ success: true });
});
