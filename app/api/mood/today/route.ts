import { NextRequest, NextResponse } from 'next/server';

// In-memory mock database
const moodsDB: Map<string, Array<{ mood: string; date: string; note?: string }>> = new Map();

// GET today's mood
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = Buffer.from(token, 'base64').toString();
    const email = decoded.split(':')[0];

    const today = new Date().toDateString();
    const userMoods = moodsDB.get(email) || [];

    const todayMood = userMoods.find(
      (m) => new Date(m.date).toDateString() === today
    );

    return NextResponse.json({ mood: todayMood?.mood || null });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST log mood
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = Buffer.from(token, 'base64').toString();
    const email = decoded.split(':')[0];

    const body = await request.json();
    const { mood, date, note } = body;

    if (!mood || !date) {
      return NextResponse.json(
        { error: 'Mood and date are required' },
        { status: 400 }
      );
    }

    const userMoods = moodsDB.get(email) || [];
    userMoods.push({ mood, date, note });
    moodsDB.set(email, userMoods);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
