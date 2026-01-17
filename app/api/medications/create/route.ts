import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log('Medication received:', body);

    return NextResponse.json(
      { success: true },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}

