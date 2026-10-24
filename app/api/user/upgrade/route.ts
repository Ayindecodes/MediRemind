// app/api/user/upgrade/route.ts
import { apiError } from '@/lib/api/errors';

// Plan changes are disabled until real payment processing exists.
// The previous handler granted paid plans to anyone who asked, without taking payment.
export async function POST() {
  return apiError(
    'payments_unavailable',
    'Paid plans are coming soon. Upgrades are not available yet.',
  );
}
