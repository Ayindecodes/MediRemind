import { NextRequest, NextResponse } from 'next/server';

const streaksDB = new Map(); // Replace with database

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = Buffer.from(token, 'base64').toString().split(':')[0];
    
    // Get or initialize streak data
    let streakData = streaksDB.get(email);
    
    if (!streakData) {
      // New user - initialize with zeros
      streakData = {
        currentStreak: 0,
        longestStreak: 0,
        weeklyAdherence: 0,
        totalMedsTaken: 0,
        lastTakenDate: null
      };
      streaksDB.set(email, streakData);
    }

    return NextResponse.json(streakData);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}