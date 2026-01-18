import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/userStorage';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const LOGS_FILE = path.join(process.cwd(), 'data', 'medication_logs.json');
const MEDICATIONS_FILE = path.join(process.cwd(), 'data', 'medications.json');

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

    // Load logs
    let logs = new Map();
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf-8');
      logs = new Map(Object.entries(JSON.parse(data)));
    }

    // Load medications for names
    let medications = new Map();
    if (fs.existsSync(MEDICATIONS_FILE)) {
      const data = fs.readFileSync(MEDICATIONS_FILE, 'utf-8');
      medications = new Map(Object.entries(JSON.parse(data)));
    }

    // Filter user's logs and enrich with medication names
    const userLogs = Array.from(logs.values())
      .filter((log: any) => log.userId === user.id)
      .map((log: any) => {
        const med: any = medications.get(log.medicationId);
        return {
          ...log,
          medicationName: med?.name || 'Unknown Medication'
        };
      })
      .sort((a: any, b: any) => new Date(b.takenAt || b.date).getTime() - new Date(a.takenAt || a.date).getTime());

    return NextResponse.json({ history: userLogs });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
  }
}