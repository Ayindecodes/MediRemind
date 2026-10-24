// app/api/medications/history/route.ts
import { NextResponse } from 'next/server';
import { MEDICATIONS_FILE, MED_LOGS_FILE } from '@/lib/userStorage';
import type { HistoryEntry, Medication, MedicationLog } from '@/lib/types';
import { withUser } from '@/lib/api/withUser';
import fs from 'fs';

export const GET = withUser(async (_request, user) => {
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
    .map((log): HistoryEntry => {
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
});
