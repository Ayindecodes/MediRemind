// app/api/medications/[id]/route.ts
// One of the signed-in person's medicines: read it, change it, or delete it. Deleting archives it,
// so it can be restored (POST …/restore) and its dose history stays.
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api/errors';
import { endDateFor, findMedicine, timeZoneOf, toColumns, toMedicine } from '@/lib/api/medicines';
import { withSession } from '@/lib/api/withSession';
import { archiveMedication, updateMedication } from '@/lib/db/medications';
import { timetableOf } from '@/lib/schedule/medicines';
import { medicineChangesSchema } from '@/lib/validation/medicines';
import { parseJsonBody } from '@/lib/validation/request';

type Context = { params: Promise<{ id: string }> };

export const GET = withSession<Context>(async (_request, { user, db }, { params }) => {
  const { id } = await params;
  const [row, timeZone] = await Promise.all([findMedicine(db, id), timeZoneOf(db, user.id)]);
  return NextResponse.json({ medication: toMedicine(row, timeZone, new Date()) });
});

export const PATCH = withSession<Context>(async (request, { user, db }, { params }) => {
  const { id } = await params;
  const input = await parseJsonBody(request, medicineChangesSchema);
  if (!input.ok) return apiError('invalid_request', input.error);
  const changes = input.data;

  const [row, timeZone] = await Promise.all([findMedicine(db, id), timeZoneOf(db, user.id)]);
  if (row.archived_at) {
    return apiError('invalid_request', 'This medicine is archived. Restore it to change it.');
  }

  // The schedule and dates are checked together, as they'll be saved
  const before = timetableOf(row)?.schedule;
  const schedule = changes.schedule ?? before;
  let endDate = changes.endDate === undefined ? row.end_date : changes.endDate;
  // A course's end date was its last dose's; once it isn't a course, it no longer ends then
  if (before?.type === 'course' && schedule?.type !== 'course' && changes.endDate === undefined) {
    endDate = null;
  }
  const columns = toColumns(changes);
  columns.end_date = endDateFor(schedule, changes.startDate ?? row.start_date, endDate, timeZone);

  const updated = await updateMedication(db, id, columns);
  return NextResponse.json({ medication: toMedicine(updated, timeZone, new Date()) });
});

export const DELETE = withSession<Context>(async (_request, { user, db }, { params }) => {
  const { id } = await params;
  const [row, timeZone] = await Promise.all([findMedicine(db, id), timeZoneOf(db, user.id)]);
  // Deleting it again changes nothing
  const archived = row.archived_at ? row : await archiveMedication(db, id);
  return NextResponse.json({ medication: toMedicine(archived, timeZone, new Date()) });
});
