export const runtime = "nodejs"; // Needed for Buffer + stable execution

import { NextRequest, NextResponse } from "next/server";

// Persistent Map (survives hot reload in dev)
const moodsDB: Map<string, any[]> =
  (globalThis as any).moodsDB || new Map();
(globalThis as any).moodsDB = moodsDB;

// -------------------------
// GET Today’s Mood
// -------------------------
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = Buffer.from(token, "base64").toString().split(":")[0];
    const today = new Date().toDateString();

    const userMoods = moodsDB.get(email) || [];
    const todayMood = userMoods.find(
      (m) => new Date(m.date).toDateString() === today
    );

    return NextResponse.json({
      mood: todayMood?.mood || null,
      note: todayMood?.note || null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// -------------------------
// POST – Log Mood
// -------------------------
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = Buffer.from(token, "base64").toString().split(":")[0];

    const { mood, date, note } = await request.json();
    const userMoods = moodsDB.get(email) || [];

    const normalizedDate = new Date(date).toDateString();

    // Remove existing entry for same day → prevents duplicates
    const cleaned = userMoods.filter(
      (m) => new Date(m.date).toDateString() !== normalizedDate
    );

    cleaned.push({
      mood,
      date: normalizedDate,
      note: note || "",
    });

    moodsDB.set(email, cleaned);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
