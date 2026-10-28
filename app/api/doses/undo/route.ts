// app/api/doses/undo/route.ts
// Removes what was recorded for a dose, so it goes back to upcoming, due or missed. Undoing twice is
// harmless: `undone` says whether there was anything to remove. `dose` is null when the dose was
// only there because it was recorded, such as an as-needed one.
import { NextResponse } from 'next/server';
import { doseAt, doseSettings } from '@/lib/api/doses';
import { apiError } from '@/lib/api/errors';
import { findMedicine } from '@/lib/api/medicines';
import { withSession } from '@/lib/api/withSession';
import { undoDose } from '@/lib/db/doses';
import { parseJsonBody } from '@/lib/validation/request';
import { undoDoseSchema } from '@/lib/validation/doses';

export const POST = withSession(async (request, { user, db }) => {
  const input = await parseJsonBody(request, undoDoseSchema);
  if (!input.ok) return apiError('invalid_request', input.error);
  const { medicationId, scheduledFor } = input.data;

  const [medicine, settings] = await Promise.all([
    findMedicine(db, medicationId),
    doseSettings(db, user.id),
  ]);
  const undone = await undoDose(db, { medicationId, scheduledFor });
  return NextResponse.json({
    undone,
    dose: doseAt(medicine, scheduledFor, null, settings, new Date()),
  });
});
