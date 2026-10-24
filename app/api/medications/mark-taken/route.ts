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

  // Extract scheduled time from medicationId
  const parts = medicationId.split('_');
  const scheduledTime = parts[parts.length - 1];
  const actualMedId = parts.slice(2, -2).join('_');

  markMedicationAsTaken(user.id, actualMedId, scheduledTime);

  return NextResponse.json({ success: true });
});
