// app/api/adherence/route.ts
// The signed-in person's streaks, over everything they've ever been due to take, and how their doses
// went over the last few days (?days=, 7 by default), overall and by medicine.
import { NextResponse } from 'next/server';
import { adherenceOf, streaksOf } from '@/lib/adherence';
import { doseSettings, dosesOf } from '@/lib/api/doses';
import { apiError } from '@/lib/api/errors';
import { withSession } from '@/lib/api/withSession';
import { listDoses } from '@/lib/db/doses';
import { listMedications } from '@/lib/db/medications';
import { addDays, localDate, zonedInstant } from '@/lib/schedule/time-zone';
import type { AdherenceSummary, Dose } from '@/lib/types';
import { adherenceQuerySchema } from '@/lib/validation/adherence';

export const GET = withSession(async (request, { user, db }) => {
  const query = adherenceQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return apiError('invalid_request', query.error.issues[0].message);
  const { days } = query.data;

  const now = new Date();
  const settings = await doseSettings(db, user.id);
  const today = localDate(now.getTime(), settings.timeZone);
  // Up to the end of today, on the person's own calendar
  const to = new Date(zonedInstant(addDays(today, 1), '00:00', settings.timeZone));

  // Archived medicines count up to the moment they were archived, so history isn't rewritten
  const [medicines, records] = await Promise.all([
    listMedications(db, user.id, { archived: 'all' }),
    listDoses(db, user.id, { from: new Date(0).toISOString(), to: to.toISOString() }),
  ]);
  const recordsOf = Map.groupBy(records, (record) => record.medication_id);

  // Each medicine's doses from its start: dosesOf() never goes before the start date
  const from = new Date(0);
  const dosesByMedicine = medicines.map((medicine) =>
    dosesOf(medicine, recordsOf.get(medicine.id) ?? [], settings, { from, to, now }),
  );
  const everything = dosesByMedicine.flat();

  const periodFrom = addDays(today, 1 - days);
  const inPeriod = (dose: Dose) => dose.date >= periodFrom;
  const byMedication = dosesByMedicine
    .map((doses) => doses.filter(inPeriod))
    .filter((doses) => doses.some((dose) => dose.scheduled))
    .map((doses) => ({ medication: doses[0].medication, ...adherenceOf(doses) }));

  const summary: AdherenceSummary = {
    streak: streaksOf(everything, today),
    period: { from: periodFrom, to: today, days },
    overall: adherenceOf(everything.filter(inPeriod)),
    byMedication,
    totalDosesTaken: records.filter((record) => record.status === 'taken').length,
  };
  return NextResponse.json(summary);
});
