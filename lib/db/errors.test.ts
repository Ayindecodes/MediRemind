import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { DbError, toDbError, unwrap } from './errors';

const pgError = (code: string, message = 'database message', hint = ''): PostgrestError =>
  ({ code, message, hint, details: '', name: 'PostgrestError' }) as PostgrestError;

describe('toDbError', () => {
  it("passes on a rule's API code and message from the database", () => {
    const error = toDbError(
      pgError('P0001', 'The free plan allows 3 active medicines.', 'upgrade_required'),
    );
    expect(error).toBeInstanceOf(DbError);
    expect(error).toMatchObject({
      code: 'upgrade_required',
      message: 'The free plan allows 3 active medicines.',
    });
  });

  it('treats an exception without a known code as a server error', () => {
    expect(toDbError(pgError('P0001', 'oops', 'not_a_code')).code).toBe('server_error');
  });

  it('answers "not found" when the access rules refuse, without revealing the row exists', () => {
    for (const code of ['42501', '23503', 'PGRST116']) {
      expect(toDbError(pgError(code))).toMatchObject({ code: 'not_found', message: 'Not found.' });
    }
  });

  it('turns broken table rules into invalid requests', () => {
    for (const code of ['23514', '23502', '22P02', '22007', '22008', '23505']) {
      expect(toDbError(pgError(code)).code).toBe('invalid_request');
    }
  });

  it("never passes on an unexpected error's own message", () => {
    const error = toDbError(pgError('53300', 'too many connections for role "postgres"'));
    expect(error.code).toBe('server_error');
    expect(error.message).not.toContain('postgres');
    expect(error.cause).toMatchObject({ code: '53300' });
  });
});

describe('unwrap', () => {
  it('returns the data, or throws the error as a DbError', () => {
    expect(unwrap({ data: [1, 2], error: null })).toEqual([1, 2]);
    expect(() => unwrap({ data: null, error: pgError('42501') })).toThrow(DbError);
  });
});
