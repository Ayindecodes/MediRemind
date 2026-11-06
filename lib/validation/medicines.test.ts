import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { medicineChangesSchema, medicineListQuerySchema, newMedicineSchema } from './medicines';

// The first problem's message, or 'ok'
const check = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? 'ok' : result.error.issues[0].message;
};

const daily = { type: 'daily', times: ['08:00'] };
const amlodipine = { name: 'Amlodipine', schedule: daily };

describe('newMedicineSchema', () => {
  it('needs only a name and a schedule, and fills in the form and unit', () => {
    expect(newMedicineSchema.parse({ ...amlodipine, name: '  Amlodipine ' })).toEqual({
      name: 'Amlodipine',
      schedule: daily,
      form: 'tablet',
      doseUnit: 'tablet',
    });
  });

  it("counts doses in the form's usual unit unless told otherwise", () => {
    expect(newMedicineSchema.parse({ ...amlodipine, form: 'liquid' }).doseUnit).toBe('ml');
    expect(newMedicineSchema.parse({ ...amlodipine, form: 'inhaler' }).doseUnit).toBe('puff');
    expect(
      newMedicineSchema.parse({ ...amlodipine, form: 'injection', doseUnit: 'unit' }).doseUnit,
    ).toBe('unit');
  });

  it('takes every detail of a medicine', () => {
    const full = {
      ...amlodipine,
      strength: '5 mg',
      form: 'tablet',
      doseAmount: 1.5,
      doseUnit: 'tablet',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      instructions: 'After food',
      notes: 'For blood pressure',
      appearance: { shape: 'round', color: 'white' },
      nafdacNumber: 'a4-1234',
      quantityRemaining: 28,
      refillAlertDays: 7,
      reminderChannels: ['push', 'sms'],
    };
    expect(newMedicineSchema.parse(full)).toEqual({ ...full, nafdacNumber: 'A4-1234' });
  });

  it('treats blank text as not given', () => {
    const parsed = newMedicineSchema.parse({ ...amlodipine, strength: ' ', notes: '' });
    expect(parsed.strength).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });

  it("checks the schedule with the schedule engine's rules", () => {
    expect(check(newMedicineSchema, { name: 'Amlodipine' })).toBe('Choose how often it is taken');
    expect(
      check(newMedicineSchema, { ...amlodipine, schedule: { type: 'daily', times: [] } }),
    ).toBe('Add at least one time of day');
  });

  it("keeps to the table's limits", () => {
    expect(check(newMedicineSchema, { ...amlodipine, name: ' ' })).toBe(
      "Enter the medicine's name",
    );
    expect(check(newMedicineSchema, { ...amlodipine, form: 'powder' })).toBe(
      'Choose the form from the list',
    );
    expect(check(newMedicineSchema, { ...amlodipine, doseAmount: 0 })).toBe(
      'The amount taken must be more than 0',
    );
    expect(check(newMedicineSchema, { ...amlodipine, doseAmount: 0.125 })).toBe(
      'Use at most 2 decimal places for the amount',
    );
    // 0.1 × 3 isn't exactly 0.3 in floating point, but it is two decimal places
    expect(check(newMedicineSchema, { ...amlodipine, doseAmount: 0.1 * 3 })).toBe('ok');
    expect(check(newMedicineSchema, { ...amlodipine, instructions: 'x'.repeat(201) })).toBe(
      'Keep the instructions to 200 characters or fewer',
    );
    expect(check(newMedicineSchema, { ...amlodipine, quantityRemaining: -1 })).toBe(
      "How much is left can't be below 0",
    );
    expect(check(newMedicineSchema, { ...amlodipine, refillAlertDays: 400 })).toBe(
      'The refill reminder must be between 1 and 365 days',
    );
    expect(check(newMedicineSchema, { ...amlodipine, startDate: '2026-02-30' })).toBe(
      'Enter the start date as a date (YYYY-MM-DD)',
    );
  });

  it('takes NAFDAC numbers as printed, and nothing else', () => {
    expect(newMedicineSchema.parse({ ...amlodipine, nafdacNumber: ' 04-5678 ' }).nafdacNumber).toBe(
      '04-5678',
    );
    expect(check(newMedicineSchema, { ...amlodipine, nafdacNumber: 'A4 1234; drop' })).toBe(
      'Enter the NAFDAC number as printed on the pack, e.g. A4-1234',
    );
  });

  it('takes each reminder channel once, from the list', () => {
    expect(check(newMedicineSchema, { ...amlodipine, reminderChannels: [] })).toBe(
      'Choose at least one way to be reminded',
    );
    expect(check(newMedicineSchema, { ...amlodipine, reminderChannels: ['sms', 'sms'] })).toBe(
      'Choose each way once',
    );
    expect(check(newMedicineSchema, { ...amlodipine, reminderChannels: ['pigeon'] })).toBe(
      'Choose reminder channels from the list',
    );
  });

  it('drops fields people may not set', () => {
    const parsed = newMedicineSchema.parse({
      ...amlodipine,
      userId: 'someone-else',
      pausedAt: '2026-10-01T00:00:00Z',
      photoPath: 'x.png',
    });
    expect(Object.keys(parsed).toSorted()).toEqual(['doseUnit', 'form', 'name', 'schedule']);
  });
});

describe('medicineChangesSchema', () => {
  it('takes any one change', () => {
    expect(medicineChangesSchema.parse({ notes: 'Taken with water' })).toEqual({
      notes: 'Taken with water',
    });
  });

  it('clears optional fields with null or blank text', () => {
    expect(
      medicineChangesSchema.parse({ endDate: null, strength: ' ', reminderChannels: null }),
    ).toEqual({ endDate: null, strength: null, reminderChannels: null });
  });

  it("can't clear what every medicine needs", () => {
    expect(check(medicineChangesSchema, { name: null })).toBe("Enter the medicine's name");
    expect(check(medicineChangesSchema, { schedule: null })).toBe('Choose how often it is taken');
  });

  it('needs at least one change it knows', () => {
    expect(check(medicineChangesSchema, {})).toBe('Send at least one change');
    expect(check(medicineChangesSchema, { archivedAt: null })).toBe('Send at least one change');
  });
});

describe('medicineListQuerySchema', () => {
  it('lists current medicines unless archived ones are asked for', () => {
    expect(medicineListQuerySchema.parse({})).toEqual({ archived: false });
    expect(medicineListQuerySchema.parse({ archived: 'true' })).toEqual({ archived: true });
    expect(check(medicineListQuerySchema, { archived: 'yes' })).toBe(
      'Send archived as true or false',
    );
  });
});
