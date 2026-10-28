// lib/validation/medicines.ts
// What the medicines routes (/api/medications) accept, matching the medications table's rules. It
// replaces lib/validation/medication.ts, which the old JSON-file routes use until Task 42.
import { z } from 'zod';
import { scheduleSchema } from '@/lib/schedule/schema';
import { blankToNull, blankToUndefined } from './request';

export const MEDICINE_FORMS = [
  'tablet',
  'capsule',
  'liquid',
  'injection',
  'cream',
  'drops',
  'inhaler',
  'patch',
] as const;
export type MedicineForm = (typeof MEDICINE_FORMS)[number];

export const DOSE_UNITS = [
  'tablet',
  'capsule',
  'ml',
  'drop',
  'puff',
  'patch',
  'application',
  'unit',
] as const;
export type DoseUnit = (typeof DOSE_UNITS)[number];

// The unit a dose is counted in when only the form is given
export const DEFAULT_DOSE_UNIT: Record<MedicineForm, DoseUnit> = {
  tablet: 'tablet',
  capsule: 'capsule',
  liquid: 'ml',
  injection: 'ml',
  cream: 'application',
  drops: 'drop',
  inhaler: 'puff',
  patch: 'patch',
};

export const REMINDER_CHANNELS = ['push', 'whatsapp', 'sms', 'email'] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export const PILL_SHAPES = ['round', 'oval', 'oblong', 'capsule', 'square', 'other'] as const;

// At most two decimal places, allowing for floating point (0.1 × 3 isn't exactly 0.3)
const twoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} must be text` })
    .trim()
    .max(max, `Keep ${label.toLowerCase()} to ${max} characters or fewer`);

const date = (label: string) => z.iso.date({ error: `Enter the ${label} as a date (YYYY-MM-DD)` });

const fields = {
  name: z
    .string({ error: "Enter the medicine's name" })
    .trim()
    .min(1, "Enter the medicine's name")
    .max(100, 'Keep the name to 100 characters or fewer'),
  // As written on the pack, e.g. '500 mg'
  strength: text('The strength', 50),
  form: z.enum(MEDICINE_FORMS, { error: 'Choose the form from the list' }),
  doseAmount: z
    .number({ error: 'Enter how much is taken each time' })
    .positive('The amount taken must be more than 0')
    .max(999_999, 'The amount taken is too large')
    .refine(twoDecimals, 'Use at most 2 decimal places for the amount'),
  doseUnit: z.enum(DOSE_UNITS, { error: 'Choose the unit from the list' }),
  schedule: scheduleSchema,
  startDate: date('start date'),
  endDate: date('end date'),
  instructions: text('The instructions', 200),
  notes: text('The notes', 500),
  // How it looks, for its picture in the app
  appearance: z.object(
    {
      shape: z.enum(PILL_SHAPES, { error: 'Choose the shape from the list' }).optional(),
      color: text('The colour', 30).optional(),
    },
    { error: 'Describe how it looks with a shape and a colour' },
  ),
  // As printed on the pack, e.g. A4-1234
  nafdacNumber: z
    .string({ error: 'Enter the NAFDAC number as printed on the pack, e.g. A4-1234' })
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9][A-Z0-9-]{0,19}$/,
      'Enter the NAFDAC number as printed on the pack, e.g. A4-1234',
    ),
  quantityRemaining: z
    .number({ error: 'Enter how much is left as a number' })
    .min(0, "How much is left can't be below 0")
    .max(99_999_999, 'How much is left is too large')
    .refine(twoDecimals, 'Use at most 2 decimal places for how much is left'),
  refillAlertDays: z
    .number({ error: 'Enter the days of supply left for the refill reminder' })
    .int('The refill reminder must be a whole number of days')
    .min(1, 'The refill reminder must be between 1 and 365 days')
    .max(365, 'The refill reminder must be between 1 and 365 days'),
  // How this medicine's reminders are sent; null uses the person's reminder settings
  reminderChannels: z
    .array(z.enum(REMINDER_CHANNELS, { error: 'Choose reminder channels from the list' }), {
      error: 'Choose how to be reminded',
    })
    .min(1, 'Choose at least one way to be reminded')
    .refine((channels) => new Set(channels).size === channels.length, 'Choose each way once'),
};

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blankToUndefined, schema.optional());
const clearable = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blankToNull, schema.nullable().optional());

/**
 * POST /api/medications. Only the name and schedule are needed: the start date defaults to today
 * in the person's time zone, the form to tablet, and the unit to the form's usual one.
 */
export const newMedicineSchema = z
  .object({
    name: fields.name,
    strength: optional(fields.strength),
    form: fields.form.optional(),
    doseAmount: fields.doseAmount.optional(),
    doseUnit: fields.doseUnit.optional(),
    schedule: fields.schedule,
    startDate: fields.startDate.optional(),
    endDate: optional(fields.endDate),
    instructions: optional(fields.instructions),
    notes: optional(fields.notes),
    appearance: fields.appearance.optional(),
    nafdacNumber: optional(fields.nafdacNumber),
    quantityRemaining: fields.quantityRemaining.optional(),
    refillAlertDays: fields.refillAlertDays.optional(),
    reminderChannels: fields.reminderChannels.optional(),
  })
  .transform(({ form = 'tablet', doseUnit, ...medicine }) => ({
    ...medicine,
    form,
    doseUnit: doseUnit ?? DEFAULT_DOSE_UNIT[form],
  }));

/**
 * PATCH /api/medications/[id]: any of the fields, at least one. Sending null (or '' for text)
 * clears an optional field.
 */
export const medicineChangesSchema = z
  .object({
    name: fields.name,
    strength: clearable(fields.strength),
    form: fields.form,
    doseAmount: fields.doseAmount,
    doseUnit: fields.doseUnit,
    schedule: fields.schedule,
    startDate: fields.startDate,
    endDate: clearable(fields.endDate),
    instructions: clearable(fields.instructions),
    notes: clearable(fields.notes),
    appearance: clearable(fields.appearance),
    nafdacNumber: clearable(fields.nafdacNumber),
    quantityRemaining: clearable(fields.quantityRemaining),
    refillAlertDays: clearable(fields.refillAlertDays),
    reminderChannels: clearable(fields.reminderChannels),
  })
  .partial()
  .refine(
    (changes) => Object.values(changes).some((value) => value !== undefined),
    'Send at least one change',
  );

export type NewMedicine = z.output<typeof newMedicineSchema>;
export type MedicineChanges = z.output<typeof medicineChangesSchema>;

/** GET /api/medications?archived=true lists archived medicines instead of current ones */
export const medicineListQuerySchema = z.object({
  archived: z
    .enum(['true', 'false'], { error: 'Send archived as true or false' })
    .optional()
    .transform((archived) => archived === 'true'),
});
