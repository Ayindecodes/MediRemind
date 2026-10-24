import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  markTakenSchema,
  medicationChangesSchema,
  newMedicationSchema,
  scheduleProblem,
} from './medication';

// The first problem's message, or 'ok'
const check = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? 'ok' : result.error.issues[0].message;
};

// Exactly what the add form sends for a new medication with the optional fields left empty
const fromAddForm = {
  name: 'Amlodipine',
  dosage: '5mg',
  form: 'tablet',
  frequency: 'daily',
  times: ['08:00'],
  startDate: '2026-10-01',
  endDate: '',
  color: 'from-blue-500 to-cyan-500',
  icon: '💊',
  notes: '',
  refillReminder: '',
  enableSound: true,
  enableEmail: true,
  soundType: 'default',
  photoUrl: null,
};

const add = (fields: Record<string, unknown>) =>
  check(newMedicationSchema, { ...fromAddForm, ...fields });

describe('newMedicationSchema', () => {
  it("accepts the add form's request, treating empty fields as not given", () => {
    const med = newMedicationSchema.parse(fromAddForm);
    expect(med).toMatchObject({ name: 'Amlodipine', times: ['08:00'], startDate: '2026-10-01' });
    expect(med.endDate).toBeUndefined();
    expect(med.notes).toBeUndefined();
    expect(med.photoUrl).toBeUndefined();
    expect(med.refillReminder).toBeUndefined();
  });

  it("drops fields a request mustn't set", () => {
    const med = newMedicationSchema.parse({
      ...fromAddForm,
      id: 'med_1',
      userId: 'someone-else',
      completed: true,
    });
    expect(med).not.toHaveProperty('id');
    expect(med).not.toHaveProperty('userId');
    expect(med).not.toHaveProperty('completed');
  });

  it('fills in the default colour, icon and times', () => {
    const med = newMedicationSchema.parse({
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: 'as_needed',
      startDate: '2026-10-01',
    });
    expect(med).toMatchObject({ color: 'from-blue-500 to-cyan-500', icon: '💊', times: [] });
  });

  it('needs a name, dosage, frequency and start date', () => {
    expect(add({ name: '  ' })).toBe('Enter the medication name');
    expect(add({ dosage: undefined })).toBe('Enter the dosage');
    expect(add({ frequency: 'hourly' })).toBe('Choose how often it is taken');
    expect(add({ startDate: undefined })).toBe('Enter the start date as a date (YYYY-MM-DD)');
  });

  it('checks reminder times', () => {
    expect(add({ times: ['8am'] })).toBe('Reminder times must use the 24-hour HH:MM format');
    expect(add({ times: ['24:00'] })).toBe('Reminder times must use the 24-hour HH:MM format');
    expect(add({ times: ['08:00', '08:00'] })).toBe('Each reminder time must be different');
    expect(add({ times: '08:00' })).toBe('Reminder times must be a list');
    const thirteen = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
    expect(add({ times: thirteen })).toBe('Add at most 12 reminder times');
  });

  it('needs a reminder time unless the medication is taken as needed', () => {
    expect(add({ times: [] })).toBe('Add at least one reminder time');
    expect(add({ times: [], frequency: 'as_needed' })).toBe('ok');
  });

  it('checks the dates', () => {
    expect(add({ startDate: '2026-02-30' })).toBe('Enter the start date as a date (YYYY-MM-DD)');
    expect(add({ endDate: '01/12/2026' })).toBe('Enter the end date as a date (YYYY-MM-DD)');
    expect(add({ endDate: '2026-09-30' })).toBe("The end date can't be before the start date");
    expect(add({ endDate: '2026-10-01' })).toBe('ok');
  });

  it('only accepts the colours, icons, forms and sounds the form offers', () => {
    expect(add({ color: 'bg-red-500 hidden' })).toBe('Choose a colour from the list');
    expect(add({ icon: '<script>' })).toBe('Choose an icon from the list');
    expect(add({ form: 'powder' })).toBe('Choose a form from the list');
    expect(add({ soundType: 'siren' })).toBe('Choose a sound from the list');
    expect(add({ icon: '❤️' })).toBe('ok');
  });

  it('limits notes and photos', () => {
    expect(add({ notes: 'x'.repeat(501) })).toBe('Notes must be 500 characters or fewer');
    expect(add({ photoUrl: 'https://example.com/pill.png' })).toBe(
      'The photo must be a PNG, JPEG or WebP image',
    );
    expect(add({ photoUrl: `data:image/png;base64,${'A'.repeat(2_000_000)}` })).toBe(
      'The photo is too large. Choose one under 1.5 MB',
    );
    expect(add({ photoUrl: 'data:image/jpeg;base64,AAAA' })).toBe('ok');
  });

  it('turns a refill reminder into a number of days', () => {
    expect(
      newMedicationSchema.parse({ ...fromAddForm, refillReminder: '7' }).refillReminder,
    ).toEqual({ enabled: true, daysLeft: 7 });
    expect(add({ refillReminder: '0' })).toBe('The refill reminder must be between 1 and 365 days');
    expect(add({ refillReminder: 'soon' })).toBe('The refill reminder must be a number of days');
  });
});

describe('medicationChangesSchema', () => {
  it('only needs the ID, and leaves out fields that were not sent', () => {
    expect(medicationChangesSchema.parse({ id: 'med_1' })).toEqual({ id: 'med_1' });
    expect(check(medicationChangesSchema, { name: 'x' })).toBe('Missing the medication ID');
  });

  it('checks the fields that were sent', () => {
    expect(check(medicationChangesSchema, { id: 'med_1', name: '' })).toBe(
      'Enter the medication name',
    );
    expect(check(medicationChangesSchema, { id: 'med_1', times: ['25:00'] })).toBe(
      'Reminder times must use the 24-hour HH:MM format',
    );
  });

  it('clears the end date and notes when sent empty', () => {
    expect(medicationChangesSchema.parse({ id: 'med_1', endDate: '', notes: null })).toEqual({
      id: 'med_1',
      endDate: null,
      notes: null,
    });
  });

  it("drops fields an edit mustn't change", () => {
    const changes = medicationChangesSchema.parse({
      id: 'med_1',
      userId: 'someone-else',
      completed: true,
      photoUrl: 'data:image/png;base64,AAAA',
      refillReminder: { enabled: true, daysLeft: 3 },
      todayDoses: [],
    });
    expect(changes).toEqual({ id: 'med_1' });
  });
});

describe('scheduleProblem', () => {
  it('checks a schedule as a whole', () => {
    const saved = { frequency: 'daily', times: ['08:00'], startDate: '2026-10-01' };
    expect(scheduleProblem(saved)).toBeNull();
    expect(scheduleProblem({ ...saved, endDate: '2026-09-01' })?.field).toBe('endDate');
    expect(scheduleProblem({ ...saved, times: [] })?.field).toBe('times');
    expect(scheduleProblem({ ...saved, times: [], frequency: 'as_needed' })).toBeNull();
    expect(scheduleProblem({ ...saved, endDate: null })).toBeNull();
  });
});

describe('markTakenSchema', () => {
  it('needs the dose ID as text', () => {
    expect(check(markTakenSchema, { medicationId: 'user_1_med_2_2026-10-01_08:00' })).toBe('ok');
    expect(check(markTakenSchema, { medicationId: 42 })).toBe('Missing the dose ID');
    expect(check(markTakenSchema, {})).toBe('Missing the dose ID');
  });
});
