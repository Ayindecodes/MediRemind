// app/api/medications/delete/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserByEmail } from '@/lib/userStorage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const user = getUserByEmail(decoded.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // TODO: delete medication logic here
    // deleteMedication(user.id, id)

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete medication error:', error);
    return NextResponse.json({ error: 'Failed to delete medication' }, { status: 500 });
  }
}
