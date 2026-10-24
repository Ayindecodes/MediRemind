// lib/validation/mood.ts
// What the mood check-in accepts.
import { z } from 'zod';
import { blankToUndefined } from './request';

export const MOODS = ['happy', 'neutral', 'sad'] as const;
export type MoodValue = (typeof MOODS)[number];

/** POST /api/mood/log */
export const moodSchema = z.object({
  mood: z.enum(MOODS, { error: 'Choose how you are feeling' }),
  note: z.preprocess(
    blankToUndefined,
    z
      .string({ error: 'The note must be text' })
      .trim()
      .max(500, 'The note must be 500 characters or fewer')
      .optional(),
  ),
});
