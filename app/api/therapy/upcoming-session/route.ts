import { NextRequest, NextResponse } from 'next/server';

// In-memory database for therapy sessions
const therapySessionsDB: Map<
  string,
  Array<{
    therapist: string;
    scheduledAt: string;
    type: string;
    unreadMessages?: number;
  }>
> = new Map();

// GET next upcoming therapy session
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const email = Buffer.from(token, 'base64').toString().split(':')[0];

    const sessions = therapySessionsDB.get(email) || [];

    // Sort by scheduledAt ascending and find the first upcoming session
    const upcomingSession = sessions
      .filter((s) => new Date(s.scheduledAt) > new Date())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] || null;

    return NextResponse.json({ session: upcomingSession });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
