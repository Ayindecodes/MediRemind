// app/api/medications/[id]/restore/route.ts
// Undoes deleting a medicine. On the free plan this counts it again, so restoring one when 3 are
// already active is refused (upgrade_required).
import { NextResponse } from 'next/server';
import { findMedicine, timeZoneOf, toMedicine } from '@/lib/api/medicines';
import { withSession } from '@/lib/api/withSession';
import { restoreMedication } from '@/lib/db/medications';

type Context = { params: Promise<{ id: string }> };

export const POST = withSession<Context>(async (_request, { user, db }, { params }) => {
  const { id } = await params;
  const [row, timeZone] = await Promise.all([findMedicine(db, id), timeZoneOf(db, user.id)]);
  // Restoring one that isn't archived changes nothing
  const restored = row.archived_at ? await restoreMedication(db, id) : row;
  return NextResponse.json({ medication: toMedicine(restored, timeZone, new Date()) });
});
