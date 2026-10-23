import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByEmail,
  type Medication,
  type MedicationLog,
  MEDICATIONS_FILE,
  MED_LOGS_FILE,
} from '@/lib/userStorage';
import { getJwtSecret } from '@/lib/env';
import jwt from 'jsonwebtoken';
import fs from 'fs';

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

    // Load logs
    let logs = new Map<string, MedicationLog>();
    if (fs.existsSync(MED_LOGS_FILE)) {
      const data = fs.readFileSync(MED_LOGS_FILE, 'utf-8');
      logs = new Map(Object.entries(JSON.parse(data)) as [string, MedicationLog][]);
    }

    // Load medications for names
    let medications = new Map<string, Medication>();
    if (fs.existsSync(MEDICATIONS_FILE)) {
      const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
      medications = new Map(Object.entries(JSON.parse(data)) as [string, Medication][]);
    }

    // Filter user's logs and enrich with medication names
    const userLogs = Array.from(logs.values())
      .filter((log) => log.userId === user.id)
      .map((log) => {
        const med = medications.get(log.medicationId);
        return {
          ...log,
          medicationName: med?.name || 'Unknown Medication',
        };
      })
      .sort(
        (a, b) => new Date(b.takenAt || b.date).getTime() - new Date(a.takenAt || a.date).getTime(),
      );

    return NextResponse.json({ history: userLogs });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
  }
}
