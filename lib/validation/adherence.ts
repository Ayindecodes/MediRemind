// lib/validation/adherence.ts
// What GET /api/adherence accepts: how many days the counts cover, today included.
import { z } from 'zod';
import { blankToUndefined } from './request';

const message = 'Ask for between 1 and 365 days';

export const adherenceQuerySchema = z.object({
  days: z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: message }).int(message).min(1, message).max(365, message).default(7),
  ),
});
