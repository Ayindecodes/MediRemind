// lib/userStorage.ts
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

/* ===================== PATHS ===================== */

const DATA_DIR = path.join(process.cwd(), 'data');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const MEDICATIONS_FILE = path.join(DATA_DIR, 'medications.json');
const MED_LOGS_FILE = path.join(DATA_DIR, 'medication_logs.json');
const MOODS_FILE = path.join(DATA_DIR, 'moods.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const THERAPY_FILE = path.join(DATA_DIR, 'therapy.json');

/* ===================== TYPES ===================== */

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  verified: boolean;
  createdAt: number;
  plan: 'free' | 'individual' | 'family';
  planExpiry?: number;
  streak: {
    current: number;
    longest: number;
    lastTaken?: string;
  };
  stats: {
    totalMedsTaken: number;
    weeklyAdherence: number;
  };
}

interface Session {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
  type: 'signup' | 'login';
}

interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  color: string;
  icon: string;
  startDate: string;
  endDate?: string;
  reminders: boolean;
  photoUrl?: string;
  form?: string;
  notes?: string;
  enableSound?: boolean;
  enableEmail?: boolean;
  soundType?: string;
  refillReminder?: {
    enabled: boolean;
    daysLeft: number;
  };
}

interface MedicationLog {
  id: string;
  userId: string;
  medicationId: string;
  scheduledTime: string;
  takenAt?: string;
  status: 'taken' | 'missed' | 'upcoming';
  date: string;
}

interface Mood {
  id: string;
  userId: string;
  mood: 'happy' | 'neutral' | 'sad';
  note?: string;
  date: string;
  timestamp: number;
}

interface Notification {
  id: string;
  userId: string;
  type: 'reminder' | 'streak' | 'session' | 'refill' | 'missed';
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

interface TherapySession {
  id: string;
  userId: string;
  therapist: string;
  date: string;
  time: string;
  type: 'video' | 'chat' | 'phone';
  status: 'upcoming' | 'completed' | 'cancelled';
  unreadMessages: number;
}

type LoginAttempt = {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
};

/* ===================== MEMORY ===================== */

const loginAttempts = new Map<string, LoginAttempt>();

/* ===================== HELPERS ===================== */

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadMap<T>(file: string): Map<string, T> {
  ensureDir();
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}));
    return new Map();
  }
  return new Map(
    Object.entries(JSON.parse(fs.readFileSync(file, 'utf8'))) as [string, T][]
  );
}

function saveMap<T>(file: string, map: Map<string, T>) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(Object.fromEntries(map), null, 2));
}

const uid = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/* ===================== USERS ===================== */

export function getUserByEmail(email: string): User | undefined {
  return loadMap<User>(USERS_FILE).get(email.toLowerCase());
}

export function createUser(fullName: string, email: string, password: string): User {
  const users = loadMap<User>(USERS_FILE);
  const key = email.toLowerCase();

  if (users.has(key)) throw new Error('Email already registered');

  const user: User = {
    id: uid('user'),
    fullName,
    email: key,
    password: bcrypt.hashSync(password, 10),
    verified: false,
    createdAt: Date.now(),
    plan: 'free',
    streak: { current: 0, longest: 0 },
    stats: { totalMedsTaken: 0, weeklyAdherence: 0 }
  };

  users.set(key, user);
  saveMap(USERS_FILE, users);
  return user;
}

export function verifyUser(email: string) {
  const users = loadMap<User>(USERS_FILE);
  const user = users.get(email.toLowerCase());
  if (!user) return false;
  user.verified = true;
  users.set(user.email, user);
  saveMap(USERS_FILE, users);
  return true;
}

export function verifyPassword(email: string, password: string) {
  const user = getUserByEmail(email);
  return user ? bcrypt.compareSync(password, user.password) : false;
}

/* ===================== SESSIONS ===================== */

export function createVerificationSession(email: string, type: 'signup' | 'login') {
  const sessions = loadMap<Session>(SESSIONS_FILE);
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  sessions.set(email.toLowerCase(), {
    email,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
    attempts: 0,
    type
  });

  saveMap(SESSIONS_FILE, sessions);
  return code;
}

export function verifyCode(email: string, code: string) {
  const sessions = loadMap<Session>(SESSIONS_FILE);
  const session = sessions.get(email.toLowerCase());

  if (!session) return { valid: false, error: 'No session found' };
  if (Date.now() > session.expiresAt) return { valid: false, error: 'Code expired' };
  if (session.code !== code) return { valid: false, error: 'Invalid code' };

  sessions.delete(email.toLowerCase());
  saveMap(SESSIONS_FILE, sessions);
  return { valid: true };
}

/* ===================== LOGIN RATE LIMIT ===================== */

export function checkRateLimit(email: string) {
  const key = email.toLowerCase();
  const attempt = loginAttempts.get(key);
  const now = Date.now();

  if (!attempt) return { allowed: true };

  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    return {
      allowed: false,
      blockedMinutes: Math.ceil((attempt.blockedUntil - now) / 60000)
    };
  }

  return {
    allowed: true,
    remainingAttempts: 5 - attempt.attempts
  };
}

export function recordFailedAttempt(email: string) {
  const key = email.toLowerCase();
  const now = Date.now();

  const attempt = loginAttempts.get(key) ?? { attempts: 0, lastAttempt: now };
  attempt.attempts += 1;
  attempt.lastAttempt = now;

  if (attempt.attempts >= 5) {
    attempt.blockedUntil = now + 30 * 60 * 1000;
  }

  loginAttempts.set(key, attempt);
}

export function resetAttempts(email: string) {
  loginAttempts.delete(email.toLowerCase());
}

/* ===================== MEDICATIONS ===================== */

export function addMedication(userId: string, data: Omit<Medication, 'id' | 'userId'>) {
  const meds = loadMap<Medication>(MEDICATIONS_FILE);
  const med = { id: uid('med'), userId, ...data };
  meds.set(med.id, med);
  saveMap(MEDICATIONS_FILE, meds);
  return med;
}

export function getUserMedications(userId: string) {
  return [...loadMap<Medication>(MEDICATIONS_FILE).values()].filter(m => m.userId === userId);
}

// ===================== TODAY'S MEDICATIONS =====================

export function getTodaysMedications(userId: string) {
  const meds = getUserMedications(userId);
  const logs = loadMap<any>(MED_LOGS_FILE);
  const today = new Date().toISOString().split('T')[0];

  return meds.flatMap(med =>
    med.times.map(time => {
      const logId = `${userId}_${med.id}_${today}_${time}`;
      const log = logs.get(logId);

      return {
        id: logId,
        medicationId: med.id,
        name: med.name,
        dosage: med.dosage,
        time,
        status: log?.status ?? 'upcoming',
        color: med.color,
        icon: med.icon,
        takenAt: log?.takenAt ?? null
      };
    })
  );
}


export function markMedicationAsTaken(userId: string, medicationId: string, scheduledTime: string) {
  const logs = loadMap<MedicationLog>(MED_LOGS_FILE);
  const today = new Date().toISOString().split('T')[0];

  const id = `${userId}_${medicationId}_${today}_${scheduledTime}`;
  logs.set(id, {
    id,
    userId,
    medicationId,
    scheduledTime,
    takenAt: new Date().toISOString(),
    status: 'taken',
    date: today
  });

  saveMap(MED_LOGS_FILE, logs);
  return { success: true };
}

/* ===================== STREAK ===================== */

export function getUserStreak(_userId: string) {
  return { current: 0, longest: 0, totalMedsTaken: 0, weeklyAdherence: 0 };
}

/* ===================== MOODS ===================== */

export function logMood(userId: string, mood: 'happy' | 'neutral' | 'sad', note?: string) {
  const moods = loadMap<Mood>(MOODS_FILE);
  const today = new Date().toISOString().split('T')[0];
  const entry = { id: `${userId}_${today}`, userId, mood, note, date: today, timestamp: Date.now() };
  moods.set(entry.id, entry);
  saveMap(MOODS_FILE, moods);
  return entry;
}

export function getTodayMood(userId: string) {
  const moods = loadMap<Mood>(MOODS_FILE);
  return moods.get(`${userId}_${new Date().toISOString().split('T')[0]}`) || null;
}

/* ===================== NOTIFICATIONS ===================== */

export function createNotification(userId: string, data: Omit<Notification, 'id' | 'userId' | 'timestamp' | 'read'>) {
  const notifs = loadMap<Notification>(NOTIFICATIONS_FILE);
  const notif = { id: uid('notif'), userId, timestamp: Date.now(), read: false, ...data };
  notifs.set(notif.id, notif);
  saveMap(NOTIFICATIONS_FILE, notifs);
  return notif;
}

export function getUserNotifications(userId: string, limit = 10) {
  return [...loadMap<Notification>(NOTIFICATIONS_FILE).values()]
    .filter(n => n.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/* ===================== THERAPY ===================== */

export function getUpcomingSession(userId: string) {
  const sessions = loadMap<TherapySession>(THERAPY_FILE);
  return [...sessions.values()].find(s => s.userId === userId && s.status === 'upcoming') || null;
}

export function updateUserPlan(userId: string, plan: 'free' | 'individual' | 'family', expiryDays?: number) {
  const users = loadMap<User>(USERS_FILE);
  const user = [...users.values()].find(u => u.id === userId);
  if (!user) throw new Error('User not found');

  user.plan = plan;
  if (expiryDays) user.planExpiry = Date.now() + expiryDays * 86400000;

  users.set(user.email, user);
  saveMap(USERS_FILE, users);
  return user;
}
