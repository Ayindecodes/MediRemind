// app/api/medications/delete/[id]/route.ts
import { NextResponse } from 'next/server';
import { createNotification, deleteMedication } from '@/lib/userStorage';
import { apiError } from '@/lib/api/errors';
import { withUser } from '@/lib/api/withUser';

export const DELETE = withUser(
  async (_request, user, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const medication = deleteMedication(user.id, id);
    if (!medication) {
      return apiError('not_found', 'Medication not found');
    }

    createNotification(user.id, {
      type: 'reminder',
      message: `Medication "${medication.name}" has been deleted`,
      actionUrl: '/dashboard/medications',
    });

    console.log(`✅ Medication ${medication.name} deleted`);

    return NextResponse.json({ success: true });
  },
);
