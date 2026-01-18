import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createNotification } from '@/lib/userStorage';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MEDICATIONS_FILE = path.join(process.cwd(), 'data', 'medications.json');

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const medId = params.id;

    // Load medications
    const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
    const medications = new Map(Object.entries(JSON.parse(data)));

    // Verify ownership
    const medication: any = medications.get(medId);
    if (!medication || medication.userId !== user.id) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // Delete medication
    medications.delete(medId);

    // Save
    fs.writeFileSync(MEDICATIONS_FILE, JSON.stringify(Object.fromEntries(medications), null, 2));

    // Create notification
    createNotification(user.id, {
      type: 'reminder',
      message: `Medication "${medication.name}" has been deleted`,
      actionUrl: '/dashboard/medications'
    });

    console.log(`✅ Medication ${medication.name} deleted`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete medication error:', error);
    return NextResponse.json({ error: 'Failed to delete medication' }, { status: 500 });
  }
}