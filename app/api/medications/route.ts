// app/api/medications/route.ts
// The signed-in person's medicines: list them (current ones, or archived with ?archived=true) and
// add one. The free plan's limit of 3 active medicines is the database's rule (upgrade_required).
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api/errors';
import { endDateFor, timeZoneOf, toColumns, toMedicine } from '@/lib/api/medicines';
import { withSession } from '@/lib/api/withSession';
import { addMedication, listMedications } from '@/lib/db/medications';
import { localDate } from '@/lib/schedule/time-zone';
import { medicineListQuerySchema, newMedicineSchema } from '@/lib/validation/medicines';
import { parseJsonBody } from '@/lib/validation/request';

export const GET = withSession(async (request, { user, db }) => {
  const query = medicineListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return apiError('invalid_request', query.error.issues[0].message);

  const [rows, timeZone] = await Promise.all([
    listMedications(db, user.id, { archived: query.data.archived }),
    timeZoneOf(db, user.id),
  ]);
  const now = new Date();
  return NextResponse.json({ medications: rows.map((row) => toMedicine(row, timeZone, now)) });
});

export const POST = withSession(async (request, { user, db }) => {
  const input = await parseJsonBody(request, newMedicineSchema);
  if (!input.ok) return apiError('invalid_request', input.error);
  const medicine = input.data;

  const now = new Date();
  const timeZone = await timeZoneOf(db, user.id);
  // Starting today, on the person's own calendar, unless they say otherwise
  const startDate = medicine.startDate ?? localDate(now.getTime(), timeZone);
  const endDate = endDateFor(medicine.schedule, startDate, medicine.endDate, timeZone);

  const row = await addMedication(db, user.id, {
    ...toColumns(medicine),
    name: medicine.name,
    schedule: medicine.schedule,
    start_date: startDate,
    end_date: endDate,
  });
  return NextResponse.json({ medication: toMedicine(row, timeZone, now) }, { status: 201 });
});
