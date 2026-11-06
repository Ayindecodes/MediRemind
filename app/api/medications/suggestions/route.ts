// app/api/medications/suggestions/route.ts
// Medicines matching what someone has typed, from the catalogue (lib/medicines). It's the same
// for everyone and has nothing personal in it, so it needs no sign-in and can be cached.
import { NextResponse, type NextRequest } from 'next/server';
import { apiError, handleErrors } from '@/lib/api/errors';
import { suggestMedicines } from '@/lib/medicines/search';
import { suggestionQuerySchema } from '@/lib/validation/medicines';

export const GET = handleErrors(async (request: NextRequest) => {
  const query = suggestionQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return apiError('invalid_request', query.error.issues[0].message);
  const { q, limit } = query.data;

  return NextResponse.json(
    { suggestions: suggestMedicines(q, limit) },
    // The list changes only with a deploy, so browsers and the CDN can keep answers for a day
    { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
  );
});
