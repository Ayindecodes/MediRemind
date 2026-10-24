// lib/types.ts
// Shapes shared by the storage layer, the API routes and the pages. Only types live here, so
// client components can import them without bundling any server code.
import type { Frequency, MedicationForm, SoundType } from './validation/medication';
import type { MoodValue } from './validation/mood';

export type { Frequency, MedicationForm, MoodValue, SoundType };

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
  | 'email_failed';

export interface ApiError {
  code: ApiErrorCode;
  // Written for the person using the app, so pages can show it as it is
  message: string;
  // Extra facts for some codes, such as retryAfterMinutes for too_many_attempts
  details?: Record<string, unknown>;
}
