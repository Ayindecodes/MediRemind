import { NextRequest, NextResponse } from 'next/server';

// Mock user storage (replace with database)
const tempUsers = new Map();

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode token to get email (in production, verify JWT)
    const email = Buffer.from(token, 'base64').toString().split(':')[0];
    const user = tempUsers.get(email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      fullName: user.fullName,
      email: user.email || email,
      accountType: user.accountType || 'personal',
      premium: user.premium || false,
      avatar: user.avatar || null
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}