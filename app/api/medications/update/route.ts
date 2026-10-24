// app/api/medications/update/route.ts
import { NextResponse } from 'next/server';
import { MEDICATIONS_FILE } from '@/lib/userStorage';
import type { Medication } from '@/lib/types';
import { apiError } from '@/lib/api/errors';
import { withUser } from '@/lib/api/withUser';
import {
  medicationChangesSchema,
  scheduleProblem,
  type MedicationChanges,
} from '@/lib/validation/medication';
import { parseJsonBody } from '@/lib/validation/request';
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

export const PUT = withUser(async (request, user) => {
  // Only editable fields are kept: the owner, ID, completion and photo can't be changed here
  const input = await parseJsonBody(request, medicationChangesSchema);
  if (!input.ok) {
    return apiError('invalid_request', input.error);
  }

  // Load medications
  const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
  const medications = new Map(Object.entries(JSON.parse(data)) as [string, Medication][]);

  // Verify ownership
  const existingMed = medications.get(input.data.id);
  if (!existingMed || existingMed.userId !== user.id) {
    return apiError('not_found', 'Medication not found');
  }

  const updated = applyChanges(existingMed, input.data);

  // An edit can clash with fields it didn't change, such as a new start date after the end date
  const problem = scheduleProblem(updated);
  if (problem) {
    return apiError('invalid_request', problem.message);
  }

  // Save
  medications.set(updated.id, updated);
  fs.writeFileSync(MEDICATIONS_FILE, JSON.stringify(Object.fromEntries(medications), null, 2));

  console.log(`✅ Medication ${updated.name} updated`);

  return NextResponse.json({ success: true, medication: updated });
});
