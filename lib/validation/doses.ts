// lib/validation/doses.ts
// What the dose routes accept. Times are ISO timestamps with a time zone (Z or +01:00), as the dose
// list gives them, and are stored as instants.
import { z } from 'zod';
import { blankToUndefined } from './request';

const medicationId = z.uuid({ error: 'Say which medicine this is' });

const timestamp = (label: string) =>
  z.iso
    .datetime({ offset: true, error: `Give ${label} as an ISO timestamp with a time zone` })
    .transform((value) => new Date(value).toISOString());

const scheduledFor = timestamp('the time the dose was due');

/** GET /api/doses?date=YYYY-MM-DD. The date is the person's own; it defaults to today. */
export const doseListQuerySchema = z.object({
  date: z.preprocess(
    blankToUndefined,
    z.iso.date({ error: 'Give the date as YYYY-MM-DD' }).optional(),
  ),
});

/**
 * POST /api/doses/take. An as-needed medicine has no due times, so its dose can leave scheduledFor
 * out and is recorded at the time it was taken. takenAt defaults to now.
 */
export const takeDoseSchema = z.object({
  medicationId,
  scheduledFor: scheduledFor.optional(),
  takenAt: timestamp('the time it was taken').optional(),
});

/** POST /api/doses/skip, with an optional reason such as "felt unwell" */
export const skipDoseSchema = z.object({
  medicationId,
  scheduledFor,
  reason: z.preprocess(
    blankToUndefined,
    z
      .string({ error: 'The reason must be text' })
      .trim()
      .max(200, 'Keep the reason to 200 characters or fewer')
      .optional(),
  ),
});

/** POST /api/doses/undo: removes what was recorded for the dose */
export const undoDoseSchema = z.object({ medicationId, scheduledFor });
