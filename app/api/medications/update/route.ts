import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/userStorage';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MEDICATIONS_FILE = path.join(process.cwd(), 'data', 'medications.json');

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const user = getUserByEmail(decoded.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedMed = await request.json();

    // Load medications
    const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
    const medications = new Map(Object.entries(JSON.parse(data)));

    // Verify ownership
    const existingMed: any = medications.get(updatedMed.id);
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