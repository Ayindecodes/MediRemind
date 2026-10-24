// lib/db/errors.ts
// Turns database errors into the API's error codes, so a route can answer with apiError().
import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { ApiException, isApiErrorCode } from '@/lib/api/errors';

// A database error, already translated: routes can let it through to handleErrors()
export class DbError extends ApiException {
  name = 'DbError';
}

export function toDbError(error: PostgrestError): DbError {
  // Rules in the database's own triggers carry the API code as their hint (e.g. upgrade_required),
  // and a message written for the person using the app
  if (error.code === 'P0001' && isApiErrorCode(error.hint)) {
    return new DbError(error.hint, error.message, { cause: error });
  }

  switch (error.code) {
    // A value broke a rule on the table. Routes validate input first, so this is rare.
    case '23514': // check_violation
    case '23502': // not_null_violation
    case '22P02': // invalid_text_representation, e.g. a malformed ID
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return new DbError('invalid_request', "That isn't a valid value.", { cause: error });
    case '23505': // unique_violation
      return new DbError('invalid_request', 'That already exists.', { cause: error });
    // To the person asking, someone else's row doesn't exist: saying "forbidden" would reveal that
    // it does
    case '42501': // insufficient_privilege, from the access rules
    case '23503': // foreign_key_violation, e.g. a dose of someone else's medicine
    case 'PGRST116': // no row where exactly one was expected
      return new DbError('not_found', 'Not found.', { cause: error });
    default:
      return new DbError('server_error', 'Something went wrong on our side. Please try again.', {
        cause: error,
      });
  }
}

// The data from a Supabase query, or its error thrown as a DbError
export function unwrap<T>(result: PostgrestSingleResponse<T>): T {
  if (result.error) throw toDbError(result.error);
  return result.data;
}
