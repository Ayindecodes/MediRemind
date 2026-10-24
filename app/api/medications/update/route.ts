import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, MEDICATIONS_FILE } from '@/lib/userStorage';
import type { Medication } from '@/lib/types';
import { getJwtSecret } from '@/lib/env';
import jwt from 'jsonwebtoken';
import fs from 'fs';

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

    const updatedMed = await request.json();

    // Load medications
    const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
    const medications = new Map(Object.entries(JSON.parse(data)) as [string, Medication][]);

    // Verify ownership
    const existingMed = medications.get(updatedMed.id);
    if (!existingMed || existingMed.userId !== user.id) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // Update medication
    medications.set(updatedMed.id, { ...existingMed, ...updatedMed, userId: user.id });

    // Save
    fs.writeFileSync(MEDICATIONS_FILE, JSON.stringify(Object.fromEntries(medications), null, 2));

    console.log(`✅ Medication ${updatedMed.name} updated`);

    return NextResponse.json({ success: true, medication: updatedMed });
  } catch (error) {
    console.error('Update medication error:', error);
    return NextResponse.json({ error: 'Failed to update medication' }, { status: 500 });
  }
}
