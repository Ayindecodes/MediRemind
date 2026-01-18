// app/api/user/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateUserPlan, getUserByEmail, createNotification } from '@/lib/userStorage';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
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

    const { plan, billingCycle } = await request.json();

    if (!['individual', 'family'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Calculate expiry days (30 days for monthly, 365 for yearly)
    const expiryDays = billingCycle === 'yearly' ? 365 : 30;

    // Update user plan
    updateUserPlan(user.id, plan, expiryDays);

    // Create success notification
    createNotification(user.id, {
      type: 'streak',
      message: `🎉 Welcome to ${plan === 'individual' ? 'Premium' : 'Family'} plan! All features are now unlocked.`,
      actionUrl: '/dashboard'
    });

    console.log(`✅ User ${user.email} upgraded to ${plan} plan`);

    // In a real app, you would:
    // 1. Process payment via Stripe/PayPal
    // 2. Create subscription record
    // 3. Send confirmation email
    // 4. Set up recurring billing

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan} plan!`,
      plan,
      expiresAt: Date.now() + (expiryDays * 24 * 60 * 60 * 1000)
    }, { status: 200 });

  } catch (error) {
    console.error('Upgrade error:', error);
    return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 });
  }
}