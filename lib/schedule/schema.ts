// lib/schedule/schema.ts
// What a medicine's schedule can be. It's stored as JSON in medications.schedule, and lib/schedule/
// doses.ts turns it into dose times.
import { z } from 'zod';

const timeOfDay = z
  .string({ error: 'Dose times must use the 24-hour HH:MM format' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Dose times must use the 24-hour HH:MM format');

const allDifferent = (list: unknown[]) => new Set(list).size === list.length;

// One or more times of day, each once, kept in order
const timesOfDay = z
  .array(timeOfDay, { error: 'Add the times of day' })
  .min(1, 'Add at least one time of day')
  .max(12, 'Add at most 12 times a day')
  .refine(allDifferent, 'Each time must be different')
  .transform((times) => times.toSorted());

// The usual prescription patterns and the times the form starts them at (people can change them)
export const PRESETS = {
  od: ['08:00'], // once a day
  bd: ['08:00', '20:00'], // twice a day
  tds: ['08:00', '14:00', '20:00'], // three times a day
  qds: ['08:00', '12:00', '16:00', '20:00'], // four times a day
  nocte: ['21:00'], // at night
} as const;

export type Preset = keyof typeof PRESETS;

export const scheduleSchema = z.discriminatedUnion(
  'type',
  [
    // The same times every day. `preset` remembers which pattern it was written as (bd, nocte…).
    z.object({
      type: z.literal('daily'),
      times: timesOfDay,
      preset: z.enum(Object.keys(PRESETS) as [Preset, ...Preset[]]).optional(),
    }),

    // Every N hours from the first dose. The gap is in real hours, so a clock change moves the
    // clock times rather than the gap.
    z.object({
      type: z.literal('every_n_hours'),
      everyHours: z
        .number({ error: 'Say how many hours apart the doses are' })
        .int('Hours apart must be a whole number')
        .min(1, 'Doses can be 1 to 24 hours apart')
        .max(24, 'Doses can be 1 to 24 hours apart'),
      firstDose: timeOfDay,
    }),

    // Every other day (2), every third day (3)…, counted from the start date
    z.object({
      type: z.literal('every_n_days'),
      everyDays: z
        .number({ error: 'Say how many days apart the doses are' })
        .int('Days apart must be a whole number')
        .min(2, 'For every day, use a daily schedule')
        .max(31, 'Doses can be at most 31 days apart'),
      times: timesOfDay,
    }),

    // Chosen days of the week: 1 = Monday … 7 = Sunday. Once a week is a single day.
    z.object({
      type: z.literal('weekdays'),
      days: z
        .array(z.number().int().min(1).max(7), { error: 'Choose the days of the week' })
        .min(1, 'Choose at least one day')
        .refine(allDifferent, 'Each day must be different')
        .transform((days) => days.toSorted()),
      times: timesOfDay,
    }),

    // A fixed course: doses at set hours after the first, e.g. artemether-lumefantrine at 0, 8, 24,
    // 36, 48 and 60 hours. It ends with its last dose.
    z.object({
      type: z.literal('course'),
      firstDose: timeOfDay,
      offsetsHours: z
        .array(
          z
            .number()
            .min(0)
            .max(24 * 90),
          { error: 'List the hours after the first dose' },
        )
        .min(1, 'A course needs at least one dose')
        .max(60, 'A course can have at most 60 doses')
        .refine((hours) => hours[0] === 0, 'The first dose is at 0 hours')
        .refine(
          (hours) => hours.every((hour, i) => i === 0 || hour > hours[i - 1]),
          'Each dose must come after the one before',
        )
        .refine(
          // Allows for rounding in decimal hours: 4.1 × 60 gives 245.99999999999997, not 246
          (hours) => hours.every((hour) => Math.abs(hour * 60 - Math.round(hour * 60)) < 1e-6),
          'Doses must fall on whole minutes',
        ),
    }),

    // Taken only when needed: no scheduled doses and no reminders
    z.object({ type: z.literal('as_needed') }),
  ],
  { error: 'Choose how often it is taken' },
);

export type Schedule = z.output<typeof scheduleSchema>;
