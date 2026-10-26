import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { doseListQuerySchema, skipDoseSchema, takeDoseSchema, undoDoseSchema } from './doses';

// The first problem's message, or 'ok'
const check = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? 'ok' : result.error.issues[0].message;
};

const medicationId = '3f1c2a9e-5b7d-4c8e-9a1f-2b3c4d5e6f70';

describe('doseListQuerySchema', () => {
  it('takes a real date, or none for today', () => {
    expect(doseListQuerySchema.parse({ date: '2026-10-26' })).toEqual({ date: '2026-10-26' });
    expect(doseListQuerySchema.parse({})).toEqual({});
    expect(doseListQuerySchema.parse({ date: '' })).toEqual({});
    for (const date of ['2026-02-29', '26-10-2026', 'today']) {
      expect(check(doseListQuerySchema, { date })).toBe('Give the date as YYYY-MM-DD');
    }
  });
});

describe('takeDoseSchema', () => {
  it('stores times as instants, however their time zone is written', () => {
    expect(
      takeDoseSchema.parse({
        medicationId,
        scheduledFor: '2026-10-20T08:00:00+01:00',
        takenAt: '2026-10-20T07:55:30.500Z',
      }),
    ).toEqual({
      medicationId,
      scheduledFor: '2026-10-20T07:00:00.000Z',
      takenAt: '2026-10-20T07:55:30.500Z',
    });
  });

  it('can leave out the due time (as-needed medicines) and the time taken', () => {
    expect(takeDoseSchema.parse({ medicationId })).toEqual({ medicationId });
  });

  it('needs a time zone on every time, so none is guessed', () => {
    expect(check(takeDoseSchema, { medicationId, scheduledFor: '2026-10-20T08:00:00' })).toBe(
      'Give the time the dose was due as an ISO timestamp with a time zone',
    );
    expect(check(takeDoseSchema, { medicationId, takenAt: '08:00' })).toBe(
      'Give the time it was taken as an ISO timestamp with a time zone',
    );
  });

  it('needs the medicine', () => {
    expect(check(takeDoseSchema, {})).toBe('Say which medicine this is');
    expect(check(takeDoseSchema, { medicationId: 'med_1_abc' })).toBe('Say which medicine this is');
  });
});

describe('skipDoseSchema', () => {
  const dose = { medicationId, scheduledFor: '2026-10-20T07:00:00Z' };

  it('takes an optional reason, tidied', () => {
    expect(skipDoseSchema.parse({ ...dose, reason: '  felt unwell ' }).reason).toBe('felt unwell');
    expect(skipDoseSchema.parse({ ...dose, reason: '   ' }).reason).toBeUndefined();
    expect(check(skipDoseSchema, { ...dose, reason: 'x'.repeat(201) })).toBe(
      'Keep the reason to 200 characters or fewer',
    );
    expect(check(skipDoseSchema, { ...dose, reason: 42 })).toBe('The reason must be text');
  });

  it('needs the due time', () => {
    expect(check(skipDoseSchema, { medicationId })).toBe(
      'Give the time the dose was due as an ISO timestamp with a time zone',
    );
  });
});

describe('undoDoseSchema', () => {
  it('needs the medicine and the due time', () => {
    expect(check(undoDoseSchema, { medicationId, scheduledFor: '2026-10-20T07:00:00Z' })).toBe(
      'ok',
    );
    expect(check(undoDoseSchema, { scheduledFor: '2026-10-20T07:00:00Z' })).toBe(
      'Say which medicine this is',
    );
  });
});
