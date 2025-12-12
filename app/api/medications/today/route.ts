import { NextRequest, NextResponse } from 'next/server';

// In-memory medications database (replace with real DB in production)
const medicationsDB: Map<
  string,
  Array<{
    id: string;
    name: string;
    dosage: string;
    time: string; // "HH:mm"
    icon?: string;
    color?: string;
    taken?: boolean;
    takenAt?: string;
  }>
> = new Map();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const email = Buffer.from(token, 'base64').toString().split(':')[0];

    const userMeds = medicationsDB.get(email) || [];

    // Map today's medications with status
    const now = new Date();
    const currentHour = now.getHours();

    const todaysMeds = userMeds.map((med) => {
      const [medHourStr] = med.time.split(':');
      const medHour = parseInt(medHourStr, 10);
      let status: 'taken' | 'upcoming' | 'pending' = 'pending';

      if (med.taken) {
        status = 'taken';
      } else if (medHour > currentHour) {
        status = 'upcoming';
      }

      return { ...med, status };
    });

    return NextResponse.json({ medications: todaysMeds });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
