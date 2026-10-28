// app/api/doses/skip/route.ts
// Records that the person chose to skip a dose, with an optional reason. It replaces anything
// recorded for the dose before, such as taking it.
import { NextResponse } from 'next/server';
import {
  checkNotArchived,
  checkScheduledDose,
  doseAt,
  doseSettings,
  isAsNeeded,
} from '@/lib/api/doses';
import { apiError } from '@/lib/api/errors';
import { findMedicine } from '@/lib/api/medicines';
import { withSession } from '@/lib/api/withSession';
import { recordDose } from '@/lib/db/doses';
import { parseJsonBody } from '@/lib/validation/request';
import { skipDoseSchema } from '@/lib/validation/doses';

export const POST = withSession(async (request, { user, db }) => {
  const input = await parseJsonBody(request, skipDoseSchema);
  if (!input.ok) return apiError('invalid_request', input.error);
  const { medicationId, scheduledFor, reason } = input.data;

  const now = new Date();
  const [medicine, settings] = await Promise.all([
    findMedicine(db, medicationId),
    doseSettings(db, user.id),
  ]);
  checkNotArchived(medicine);
  if (isAsNeeded(medicine)) {
    return apiError('invalid_request', 'As-needed medicines have no doses to skip.');
  }
  checkScheduledDose(medicine, scheduledFor, settings, now);

  const record = await recordDose(db, user.id, {
    medicationId,
    scheduledFor,
    status: 'skipped',
    skipReason: reason,
  });
  return NextResponse.json({ dose: doseAt(medicine, scheduledFor, record, settings, now) });
});
