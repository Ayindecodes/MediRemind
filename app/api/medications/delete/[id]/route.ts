// app/api/medications/delete/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createNotification, deleteMedication, getUserByEmail } from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { email: string };
    const user = getUserByEmail(decoded.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const medication = deleteMedication(user.id, id);
    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    createNotification(user.id, {
      type: 'reminder',
      message: `Medication "${medication.name}" has been deleted`,
      actionUrl: '/dashboard/medications',
    });

    console.log(`✅ Medication ${medication.name} deleted`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete medication error:', error);
    return NextResponse.json({ error: 'Failed to delete medication' }, { status: 500 });
  }
}
