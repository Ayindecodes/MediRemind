// app/api/user/upgrade/route.ts
import { NextResponse } from 'next/server';

// Plan changes are disabled until real payment processing exists.
// The previous handler granted paid plans to anyone who asked, without taking payment.
export async function POST() {
  return NextResponse.json(
    { error: 'Paid plans are coming soon. Upgrades are not available yet.' },
    { status: 403 }
  );
}
