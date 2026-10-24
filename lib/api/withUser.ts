// lib/api/withUser.ts
// The login check for protected routes, written once.
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import { getJwtSecret } from '@/lib/env';
import { getUserByEmail, type User } from '@/lib/userStorage';
import { apiError, handleErrors } from './errors';

// The email in a valid `Authorization: Bearer <token>` header, or null if the token is missing,
// malformed, expired or signed with another secret
function emailFromToken(request: Request, secret: string): string | null {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret);
    return typeof payload === 'object' && typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

/**
 * Wraps a handler that needs a signed-in user, and passes it the user. A request without a valid
 * token, or for an account that no longer exists, gets a 401 so the app can ask the person to log
 * in again. Unexpected errors become a 500 (see handleErrors).
 */
export function withUser<Context = unknown>(
  handler: (request: NextRequest, user: User, context: Context) => Promise<Response>,
) {
  return handleErrors(async (request: NextRequest, context?: Context) => {
    // Read outside the token check, so a server without JWT_SECRET answers 500, not 401
    const secret = getJwtSecret();

    if (!request.headers.has('authorization')) {
      return apiError('unauthorized', 'Please log in to continue.');
    }

    const email = emailFromToken(request, secret);
    const user = email ? getUserByEmail(email) : undefined;
    if (!user) {
      return apiError('unauthorized', 'Your session has ended. Please log in again.');
    }

    return handler(request, user, context as Context);
  });
}
