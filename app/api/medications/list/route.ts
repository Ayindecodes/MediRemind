// app/api/medications/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserMedications, getUserByEmail } from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
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

    const medications = getUserMedications(user.id);

    return NextResponse.json({ medications });
  } catch (error) {
    console.error('List medications error:', error);
    return NextResponse.json({ error: 'Failed to get medications' }, { status: 500 });
  }
}
