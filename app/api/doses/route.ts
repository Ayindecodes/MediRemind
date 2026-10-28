// app/api/doses/route.ts
// The signed-in person's doses for a day (?date=YYYY-MM-DD, today by default), in their own time
// zone, each with its state: upcoming, due, missed, taken, taken late or skipped.
import { NextResponse } from 'next/server';
import { doseSettings, dosesOf } from '@/lib/api/doses';
import { apiError } from '@/lib/api/errors';
import { withSession } from '@/lib/api/withSession';
import { listDoses } from '@/lib/db/doses';
import { listMedications } from '@/lib/db/medications';
import { addDays, localDate, zonedInstant } from '@/lib/schedule/time-zone';
import { doseListQuerySchema } from '@/lib/validation/doses';

export const GET = withSession(async (request, { user, db }) => {
  const query = doseListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return apiError('invalid_request', query.error.issues[0].message);

  const now = new Date();
  const settings = await doseSettings(db, user.id);
  const { timeZone } = settings;
  const date = query.data.date ?? localDate(now.getTime(), timeZone);
  // From midnight to midnight on the person's own clock
  const from = new Date(zonedInstant(date, '00:00', timeZone));
  const to = new Date(zonedInstant(addDays(date, 1), '00:00', timeZone));

  // Archived medicines are left out; finished and not-yet-started ones just have no doses
  const [medicines, records] = await Promise.all([
    listMedications(db, user.id),
    listDoses(db, user.id, { from: from.toISOString(), to: to.toISOString() }),
  ]);
  const recordsOf = Map.groupBy(records, (record) => record.medication_id);

  const doses = medicines
    .flatMap((medicine) =>
      dosesOf(medicine, recordsOf.get(medicine.id) ?? [], settings, { from, to, now }),
    )
    .sort(
      (a, b) =>
        Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor) ||
        a.medication.name.localeCompare(b.medication.name),
    );

  return NextResponse.json({ date, timeZone, doses });
});
