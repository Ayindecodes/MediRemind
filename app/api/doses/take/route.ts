// app/api/doses/take/route.ts
// Records a dose as taken. Sending it again keeps the time it was first taken, unless a new takenAt
// is given, so a double tap or a retried request changes nothing.
import { NextResponse } from 'next/server';
import {
  CLOCK_ALLOWANCE,
  checkNotArchived,
  checkScheduledDose,
  doseAt,
  doseSettings,
  isAsNeeded,
} from '@/lib/api/doses';
import { apiError } from '@/lib/api/errors';
import { findMedicine } from '@/lib/api/medicines';
import { withSession } from '@/lib/api/withSession';
import { getDose, recordDose } from '@/lib/db/doses';
import { parseJsonBody } from '@/lib/validation/request';
import { takeDoseSchema } from '@/lib/validation/doses';

export const POST = withSession(async (request, { user, db }) => {
  const input = await parseJsonBody(request, takeDoseSchema);
  if (!input.ok) return apiError('invalid_request', input.error);
  const { medicationId, takenAt } = input.data;

  const now = new Date();
  const latest = now.getTime() + CLOCK_ALLOWANCE;
  const [medicine, settings] = await Promise.all([
    findMedicine(db, medicationId),
    doseSettings(db, user.id),
  ]);
  checkNotArchived(medicine);
  if (takenAt && Date.parse(takenAt) > latest) {
    return apiError('invalid_request', "The time it was taken can't be in the future.");
  }

  let scheduledFor: string;
  if (isAsNeeded(medicine)) {
    // An as-needed dose has no due time, so it's recorded at the time it was taken
    scheduledFor = input.data.scheduledFor ?? takenAt ?? now.toISOString();
    if (Date.parse(scheduledFor) > latest) {
      return apiError('invalid_request', "An as-needed dose can't be recorded in the future.");
    }
  } else {
    if (!input.data.scheduledFor) {
      return apiError('invalid_request', 'Say which dose this is: the time it was due.');
    }
    scheduledFor = input.data.scheduledFor;
    checkScheduledDose(medicine, scheduledFor, settings, now);
  }

  const dose = { medicationId, scheduledFor };
  const recorded = await getDose(db, dose);
  const record =
    recorded?.status === 'taken' && !takenAt
      ? recorded
      : await recordDose(db, user.id, {
          ...dose,
          status: 'taken',
          takenAt: takenAt ?? (isAsNeeded(medicine) ? scheduledFor : now.toISOString()),
        });

  return NextResponse.json({ dose: doseAt(medicine, scheduledFor, record, settings, now) });
});
