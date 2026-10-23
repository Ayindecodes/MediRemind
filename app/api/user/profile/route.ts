import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/userStorage';
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

    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      plan: user.plan,
      planExpiry: user.planExpiry,
      verified: user.verified,
    });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
