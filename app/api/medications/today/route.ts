import { NextRequest, NextResponse } from 'next/server';
import { getTodaysMedications, getUserByEmail } from '@/lib/userStorage';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
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

    const medications = getTodaysMedications(user.id);

    return NextResponse.json({ medications });
  } catch (error) {
    console.error('Medications error:', error);
    return NextResponse.json({ error: 'Failed to get medications' }, { status: 500 });
  }
}