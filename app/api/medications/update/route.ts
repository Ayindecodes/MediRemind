import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, MEDICATIONS_FILE } from '@/lib/userStorage';
import type { Medication } from '@/lib/types';
import { getJwtSecret } from '@/lib/env';
import {
  medicationChangesSchema,
  scheduleProblem,
  type MedicationChanges,
} from '@/lib/validation/medication';
import { parseJsonBody } from '@/lib/validation/request';
import jwt from 'jsonwebtoken';
import fs from 'fs';

// The saved medication with the edits applied. null clears the end date or the notes.
function applyChanges(
  med: Medication,
  { id: _id, endDate, notes, ...changes }: MedicationChanges,
): Medication {
  const updated: Medication = { ...med, ...changes };
  if (endDate !== undefined) updated.endDate = endDate ?? undefined;
  if (notes !== undefined) updated.notes = notes ?? undefined;
  return updated;
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { email: string };
    const user = getUserByEmail(decoded.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only editable fields are kept: the owner, ID, completion and photo can't be changed here
    const input = await parseJsonBody(request, medicationChangesSchema);
    if (!input.ok) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }

    // Load medications
    const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
    const medications = new Map(Object.entries(JSON.parse(data)) as [string, Medication][]);

    // Verify ownership
    const existingMed = medications.get(input.data.id);
    if (!existingMed || existingMed.userId !== user.id) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    const updated = applyChanges(existingMed, input.data);

    // An edit can clash with fields it didn't change, such as a new start date after the end date
    const problem = scheduleProblem(updated);
    if (problem) {
      return NextResponse.json({ error: problem.message }, { status: 400 });
    }

    // Save
    medications.set(updated.id, updated);
    fs.writeFileSync(MEDICATIONS_FILE, JSON.stringify(Object.fromEntries(medications), null, 2));

    console.log(`✅ Medication ${updated.name} updated`);

    return NextResponse.json({ success: true, medication: updated });
  } catch (error) {
    console.error('Update medication error:', error);
    return NextResponse.json({ error: 'Failed to update medication' }, { status: 500 });
  }
}
