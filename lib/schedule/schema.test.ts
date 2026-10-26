import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRESETS, scheduleSchema } from './schema';

const problem = (input: unknown) => {
  const result = scheduleSchema.safeParse(input);
  return result.success ? 'ok' : result.error.issues[0].message;
};

describe('scheduleSchema', () => {
  it('takes the usual prescription patterns as daily times', () => {
    expect(scheduleSchema.parse({ type: 'daily', times: PRESETS.bd, preset: 'bd' })).toEqual({
      type: 'daily',
      times: ['08:00', '20:00'],
      preset: 'bd',
    });
    expect(problem({ type: 'daily', times: PRESETS.nocte, preset: 'nocte' })).toBe('ok');
  });

  it('keeps times in order and refuses repeats', () => {
    expect(scheduleSchema.parse({ type: 'daily', times: ['20:00', '08:00'] })).toEqual({
      type: 'daily',
      times: ['08:00', '20:00'],
    });
    expect(problem({ type: 'daily', times: ['08:00', '08:00'] })).toBe(
      'Each time must be different',
    );
    expect(problem({ type: 'daily', times: [] })).toBe('Add at least one time of day');
    expect(problem({ type: 'daily', times: ['8am'] })).toBe(
      'Dose times must use the 24-hour HH:MM format',
    );
  });

  it('takes every 8 or 12 hours from a first dose', () => {
    expect(problem({ type: 'every_n_hours', everyHours: 8, firstDose: '06:00' })).toBe('ok');
    expect(problem({ type: 'every_n_hours', everyHours: 0, firstDose: '06:00' })).toBe(
      'Doses can be 1 to 24 hours apart',
    );
    expect(problem({ type: 'every_n_hours', everyHours: 7.5, firstDose: '06:00' })).toBe(
      'Hours apart must be a whole number',
    );
  });

  it('takes every other day, and points every day to the daily schedule', () => {
    expect(problem({ type: 'every_n_days', everyDays: 2, times: ['08:00'] })).toBe('ok');
    expect(problem({ type: 'every_n_days', everyDays: 1, times: ['08:00'] })).toBe(
      'For every day, use a daily schedule',
    );
  });

  it('takes chosen weekdays, kept in order', () => {
    expect(scheduleSchema.parse({ type: 'weekdays', days: [5, 1, 3], times: ['08:00'] })).toEqual({
      type: 'weekdays',
      days: [1, 3, 5],
      times: ['08:00'],
    });
    expect(problem({ type: 'weekdays', days: [8], times: ['08:00'] })).not.toBe('ok');
    expect(problem({ type: 'weekdays', days: [], times: ['08:00'] })).toBe(
      'Choose at least one day',
    );
  });

  it('takes a course of doses at set hours after the first, like artemether-lumefantrine', () => {
    expect(
      problem({ type: 'course', firstDose: '08:00', offsetsHours: [0, 8, 24, 36, 48, 60] }),
    ).toBe('ok');
    expect(problem({ type: 'course', firstDose: '08:00', offsetsHours: [8, 24] })).toBe(
      'The first dose is at 0 hours',
    );
    expect(problem({ type: 'course', firstDose: '08:00', offsetsHours: [0, 24, 8] })).toBe(
      'Each dose must come after the one before',
    );
    expect(problem({ type: 'course', firstDose: '08:00', offsetsHours: [0, 0.01] })).toBe(
      'Doses must fall on whole minutes',
    );
    // 4.1 hours is 246 minutes, though 4.1 × 60 isn't exactly 246 in floating point
    expect(problem({ type: 'course', firstDose: '08:00', offsetsHours: [0, 4.1, 8.2] })).toBe('ok');
  });

  it('takes as-needed medicines, which have no schedule to keep', () => {
    expect(scheduleSchema.parse({ type: 'as_needed', times: ['08:00'] })).toEqual({
      type: 'as_needed',
    });
  });

  it('refuses anything else', () => {
    expect(problem({ type: 'monthly' })).toBe('Choose how often it is taken');
    expect(problem(['08:00'])).toBe('Choose how often it is taken');
  });
});

describe('the database', () => {
  it('accepts exactly the kinds of schedule defined here', () => {
    // The latest migration that sets the medications_schedule_type rule
    const folder = path.join(process.cwd(), 'supabase/migrations');
    const migration = fs
      .readdirSync(folder)
      .sort()
      .map((file) => fs.readFileSync(path.join(folder, file), 'utf8'))
      .filter((sql) => sql.includes('medications_schedule_type'))
      .at(-1)!;
    // The quoted names inside `in (...)`
    const list = migration.match(/in \(([^)]*)\)/)![1];
    const inDatabase = [...list.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);

    const inSchema = scheduleSchema.options.map((option) => option.shape.type.value);
    expect(inDatabase.toSorted()).toEqual(inSchema.toSorted());
  });
});
