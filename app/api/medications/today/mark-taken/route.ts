export const runtime = "nodejs"; // Fix Buffer + Map reset warnings

import { NextRequest, NextResponse } from 'next/server';

// Persistent storage during dev
const medicationsDB: Map<string, any[]> =
  (globalThis as any).medicationsDB || new Map();
const streaksDB: Map<string, any> =
  (globalThis as any).streaksDB || new Map();

(globalThis as any).medicationsDB = medicationsDB;
(globalThis as any).streaksDB = streaksDB;

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode token safely
    const email = Buffer.from(token, 'base64').toString().split(':')[0];

    const { medicationId, takenAt } = await request.json();

    // Get user's medications
    const userMeds = medicationsDB.get(email) || [];
    const medIndex = userMeds.findIndex((m) => m.id === medicationId);

    if (medIndex !== -1) {
      userMeds[medIndex].taken = true;
      userMeds[medIndex].takenAt = takenAt;
      medicationsDB.set(email, userMeds);
    }

    // Streak logic
    let streakData =
      streaksDB.get(email) || {
        currentStreak: 0,
        longestStreak: 0,
        weeklyAdherence: 0,
        totalMedsTaken: 0,
        lastTakenDate: null,
      };

    const today = new Date().toDateString();
    const lastTaken = streakData.lastTakenDate;

    streakData.totalMedsTaken++;

    if (lastTaken !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (lastTaken === yesterday) {
        streakData.currentStreak++;
      } else {
        streakData.currentStreak = 1;
      }

      streakData.lastTakenDate = today;

      if (streakData.currentStreak > streakData.longestStreak) {
        streakData.longestStreak = streakData.currentStreak;
      }
    }

    // Weekly adherence
    const totalScheduled = userMeds.length * 7;
    const totalTaken = userMeds.filter((m) => m.taken).length * 7;

    streakData.weeklyAdherence =
      totalScheduled === 0
        ? 0
        : Math.round((totalTaken / totalScheduled) * 100);

    streaksDB.set(email, streakData);

    return NextResponse.json({
      success: true,
      message: 'Medication marked as taken',
      streak: streakData,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
