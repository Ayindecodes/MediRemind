// lib/types.ts
// Shapes shared by the storage layer, the API routes and the pages. Only types live here, so
// client components can import them without bundling any server code.
import type { MedicineStatus } from './schedule/medicines';
import type { Schedule } from './schedule/schema';
import type { DoseState } from './schedule/status';
import type { Frequency, MedicationForm, SoundType } from './validation/medication';
import type { Appearance, DoseUnit, MedicineForm, ReminderChannel } from './validation/medicines';
import type { MoodValue } from './validation/mood';

export type {
  Appearance,
  DoseState,
  DoseUnit,
  Frequency,
  MedicationForm,
  MedicineForm,
  MedicineStatus,
  MoodValue,
  ReminderChannel,
  Schedule,
  SoundType,
};

export type Plan = 'free' | 'individual' | 'family';

/** A medication as stored, and as returned by GET /api/medications/list */
export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  form?: MedicationForm;
  frequency: Frequency;
  times: string[];
  startDate: string;
  endDate?: string;
  color: string;
  icon: string;
  reminders: boolean;
  photoUrl?: string;
  notes?: string;
  enableSound?: boolean;
  enableEmail?: boolean;
  soundType?: SoundType;
  refillReminder?: {
    enabled: boolean;
    daysLeft: number;
  };
  // Set by the check-completions job once the end date has passed
  completed?: boolean;
  completedAt?: string;
}

export type DoseStatus = 'taken' | 'missed' | 'upcoming';

/** A dose taken, as stored. Its ID is `<userId>_<medicationId>_<YYYY-MM-DD>_<HH:MM>`. */
export interface MedicationLog {
  id: string;
  userId: string;
  medicationId: string;
  scheduledTime: string;
  takenAt?: string;
  status: DoseStatus;
  date: string;
}

/** One scheduled time today, from GET /api/medications/today. Its ID is the log's ID. */
export interface TodayDose {
  id: string;
  medicationId: string;
  name: string;
  dosage: string;
  time: string;
  status: DoseStatus;
  color: string;
  icon: string;
  takenAt: string | null;
}

/** A dose in GET /api/medications/history, newest first */
export type HistoryEntry = MedicationLog & { medicationName: string };

/**
 * A medicine as the new medicines routes return it (/api/medications), for people signed in with
 * Supabase. It replaces Medication when the JSON-file routes go (Task 42).
 */
export interface Medicine {
  id: string;
  name: string;
  strength: string | null;
  form: MedicineForm;
  doseAmount: number;
  doseUnit: DoseUnit;
  schedule: Schedule;
  startDate: string;
  // A course's is the date of its last dose
  endDate: string | null;
  instructions: string | null;
  notes: string | null;
  appearance: Appearance | null;
  nafdacNumber: string | null;
  quantityRemaining: number | null;
  refillAlertDays: number | null;
  // null: the person's reminder settings decide
  reminderChannels: ReminderChannel[] | null;
  status: MedicineStatus;
  // The next dose due, or null for an as-needed, finished, paused or archived medicine
  nextDose: { scheduledFor: string; date: string; time: string } | null;
  pausedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A dose as the new dose routes return it (GET /api/doses and POST /api/doses/take, skip and undo),
 * for people signed in with Supabase.
 */
export interface Dose {
  medication: {
    id: string;
    name: string;
    strength: string | null;
    form: string;
    doseAmount: number;
    doseUnit: string;
    instructions: string | null;
  };
  // When it was due (for an as-needed dose, when it was taken). Send it back to take, skip or undo
  // the dose.
  scheduledFor: string;
  // The person's own date and clock time for it
  date: string;
  time: string;
  state: DoseState;
  takenAt: string | null;
  skipReason: string | null;
  // False for a recorded dose the schedule doesn't have, such as an as-needed one
  scheduled: boolean;
}

export interface Mood {
  id: string;
  userId: string;
  mood: MoodValue;
  note?: string;
  date: string;
  timestamp: number;
}

export type NotificationType = 'reminder' | 'streak' | 'session' | 'refill' | 'missed';

/** An in-app notification, as stored and as returned by GET /api/notifications */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

/** A coaching session (nothing creates these yet) */
export interface TherapySession {
  id: string;
  userId: string;
  therapist: string;
  date: string;
  time: string;
  type: 'video' | 'chat' | 'phone';
  status: 'upcoming' | 'completed' | 'cancelled';
  unreadMessages: number;
}

/** GET /api/user/profile */
export interface Profile {
  id: string;
  fullName: string;
  email: string;
  plan: Plan;
  planExpiry?: number;
  verified: boolean;
}

/** GET /api/user/streak */
export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalMedsTaken: number;
  weeklyAdherence: number;
}

/** What went wrong, in every error response the API sends: `{ "error": ApiError }` */
export type ApiErrorCode =
  | 'invalid_request'
  | 'invalid_code'
  | 'already_verified'
  | 'unauthorized'
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'upgrade_required'
  | 'payments_unavailable'
  | 'not_found'
  | 'email_taken'
  | 'too_many_attempts'
  | 'server_error'
  | 'email_failed'
  | 'sms_failed';

export interface ApiError {
  code: ApiErrorCode;
  // Written for the person using the app, so pages can show it as it is
  message: string;
  // Extra facts for some codes, such as retryAfterMinutes for too_many_attempts
  details?: Record<string, unknown>;
}
