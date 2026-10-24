// lib/validation/medication.ts
// What the medication routes accept. Fields not listed here are dropped, so a request can't set a
// medication's owner, ID or completion status.
import { z } from 'zod';
import { blankToNull, blankToUndefined } from './request';

export const MEDICATION_FORMS = [
  'tablet',
  'capsule',
  'liquid',
  'injection',
  'cream',
  'drops',
  'inhaler',
  'patch',
] as const;

export const FREQUENCIES = [
  'as_needed',
  'daily',
  'twice_daily',
  'three_times',
  'four_times',
  'every_other_day',
  'weekly',
  'custom',
] as const;

export const SOUND_TYPES = ['default', 'gentle', 'urgent', 'melody'] as const;

// The colour themes and icons offered by the add form; the first of each is the default
export const MEDICATION_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-emerald-500',
  'from-amber-500 to-orange-500',
  'from-red-500 to-rose-500',
  'from-indigo-500 to-purple-500',
] as const;

export const MEDICATION_ICONS = [
  '💊',
  '💉',
  '🩹',
  '🧪',
  '🧬',
  '⚕️',
  '🔬',
  '💙',
  '❤️',
  '💚',
] as const;

export type MedicationForm = (typeof MEDICATION_FORMS)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type SoundType = (typeof SOUND_TYPES)[number];

const MAX_TIMES = 12;

const name = z
  .string({ error: 'Enter the medication name' })
  .trim()
  .min(1, 'Enter the medication name')
  .max(100, 'The medication name must be 100 characters or fewer');

const dosage = z
  .string({ error: 'Enter the dosage' })
  .trim()
  .min(1, 'Enter the dosage')
  .max(50, 'The dosage must be 50 characters or fewer');

const timeOfDay = z
  .string({ error: 'Reminder times must use the 24-hour HH:MM format' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Reminder times must use the 24-hour HH:MM format');

const times = z
  .array(timeOfDay, { error: 'Reminder times must be a list' })
  .max(MAX_TIMES, `Add at most ${MAX_TIMES} reminder times`)
  .refine((list) => new Set(list).size === list.length, 'Each reminder time must be different');

const date = (label: string) => z.iso.date({ error: `Enter the ${label} as a date (YYYY-MM-DD)` });

const notes = z
  .string({ error: 'Notes must be text' })
  .trim()
  .max(500, 'Notes must be 500 characters or fewer');

// A photo from the add form: a data URL, at most about 1.5 MB of image
const photo = z
  .string({ error: 'The photo must be an image' })
  .max(2_000_000, 'The photo is too large. Choose one under 1.5 MB')
  .regex(/^data:image\/(png|jpeg|webp);base64,/, 'The photo must be a PNG, JPEG or WebP image');

// Fields that can be set when adding a medication and changed when editing it
const medicationFields = z.object({
  name,
  dosage,
  form: z.enum(MEDICATION_FORMS, { error: 'Choose a form from the list' }).optional(),
  frequency: z.enum(FREQUENCIES, { error: 'Choose how often it is taken' }),
  times,
  startDate: date('start date'),
  endDate: z.preprocess(blankToUndefined, date('end date').optional()),
  color: z.enum(MEDICATION_COLORS, { error: 'Choose a colour from the list' }),
  icon: z.enum(MEDICATION_ICONS, { error: 'Choose an icon from the list' }),
  notes: z.preprocess(blankToUndefined, notes.optional()),
  enableSound: z.boolean({ error: 'Sound notifications must be on or off' }).optional(),
  enableEmail: z.boolean({ error: 'Email notifications must be on or off' }).optional(),
  soundType: z.enum(SOUND_TYPES, { error: 'Choose a sound from the list' }).optional(),
});

type Schedule = {
  frequency?: string;
  times?: string[];
  startDate?: string;
  endDate?: string | null;
};

/**
 * The first problem with a schedule as a whole, or null. Edits are checked after they're merged
 * with the saved medication, so a change can't break a rule on its own either.
 */
export function scheduleProblem(
  med: Schedule,
): { field: 'times' | 'endDate'; message: string } | null {
  if (med.frequency !== 'as_needed' && !med.times?.length) {
    return { field: 'times', message: 'Add at least one reminder time' };
  }
  if (med.startDate && med.endDate && med.endDate < med.startDate) {
    return { field: 'endDate', message: "The end date can't be before the start date" };
  }
  return null;
}

const checkSchedule = (med: Schedule, ctx: z.RefinementCtx) => {
  const problem = scheduleProblem(med);
  if (problem) ctx.addIssue({ code: 'custom', path: [problem.field], message: problem.message });
};

/** POST /api/medications/add */
export const newMedicationSchema = medicationFields
  .extend({
    times: times.default([]),
    color: medicationFields.shape.color.default(MEDICATION_COLORS[0]),
    icon: medicationFields.shape.icon.default(MEDICATION_ICONS[0]),
    // The form sends null when there's no photo. Only paid plans may add one; the route checks.
    photoUrl: z.preprocess((value) => blankToUndefined(value ?? undefined), photo.optional()),
    // Days of supply left when the refill reminder should go off
    refillReminder: z
      .preprocess(
        (value) => blankToUndefined(value ?? undefined),
        z.coerce
          .number({ error: 'The refill reminder must be a number of days' })
          .int('The refill reminder must be a whole number of days')
          .min(1, 'The refill reminder must be between 1 and 365 days')
          .max(365, 'The refill reminder must be between 1 and 365 days')
          .optional(),
      )
      .transform((days) => (days === undefined ? undefined : { enabled: true, daysLeft: days })),
  })
  .superRefine(checkSchedule);

/**
 * PUT /api/medications/update: the medication's ID plus any fields to change. Sending '' or null
 * for the end date or notes clears them. Photos and refill reminders can't be changed here.
 */
export const medicationChangesSchema = medicationFields
  .extend({
    endDate: z.preprocess(blankToNull, date('end date').nullable()),
    notes: z.preprocess(blankToNull, notes.nullable()),
  })
  .partial()
  .extend({
    id: z
      .string({ error: 'Missing the medication ID' })
      .min(1, 'Missing the medication ID')
      .max(100, 'Medication not found'),
  });

/** POST /api/medications/mark-taken. The ID is a dose ID from GET /api/medications/today. */
export const markTakenSchema = z.object({
  medicationId: z
    .string({ error: 'Missing the dose ID' })
    .min(1, 'Missing the dose ID')
    .max(200, 'Dose not found'),
});

export type NewMedication = z.infer<typeof newMedicationSchema>;
export type MedicationChanges = z.infer<typeof medicationChangesSchema>;
