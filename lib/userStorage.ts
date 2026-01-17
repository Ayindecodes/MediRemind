import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/* ===================== PATHS ===================== */

const DATA_DIR = path.join(process.cwd(), 'data');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const MED_LOGS_FILE = path.join(DATA_DIR, 'medication_logs.json');

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
}

type Session = {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
  type: 'signup' | 'login';
};

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

/* ===================== USERS ===================== */

export function getUserByEmail(email: string): User | undefined {
  return loadMap<User>(USERS_FILE).get(email.toLowerCase());
}

export function createUser(
  fullName: string,
  email: string,
  password: string
): User {
  const users = loadMap<User>(USERS_FILE);
  const key = email.toLowerCase();

  if (users.has(key)) {
    throw new Error('User already exists');
  }

  const user: User = {
  id: crypto.randomUUID(),
  fullName,
  email: key,
  password: bcrypt.hashSync(password, 10),
  verified: false,
  createdAt: Date.now(),
  plan: 'free'
};


  users.set(key, user);
  saveMap(USERS_FILE, users);
  return user;
}

export function verifyUser(email: string): boolean {
  const users = loadMap<User>(USERS_FILE);
  const user = users.get(email.toLowerCase());
  if (!user) return false;

  user.verified = true;
  users.set(email.toLowerCase(), user);
  saveMap(USERS_FILE, users);
  return true;
}

export function verifyPassword(email: string, password: string): boolean {
  const user = getUserByEmail(email);
  if (!user) return false;
  return bcrypt.compareSync(password, user.password);
}

/* ===================== VERIFICATION ===================== */

export function createVerificationSession(
  email: string,
  type: 'signup' | 'login'
) {
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

export function verifyCode(
  email: string,
  code: string
): { valid: boolean; error?: string } {
  const sessions = loadMap<Session>(SESSIONS_FILE);
  const session = sessions.get(email.toLowerCase());

  if (!session) return { valid: false, error: 'No session found' };
  if (Date.now() > session.expiresAt)
    return { valid: false, error: 'Code expired' };
  if (session.code !== code)
    return { valid: false, error: 'Invalid code' };

  sessions.delete(email.toLowerCase());
  saveMap(SESSIONS_FILE, sessions);
  return { valid: true };
}

/* ===================== RATE LIMIT ===================== */

export function checkRateLimit(email: string) {
  const key = email.toLowerCase();
  const attempt = loginAttempts.get(key);
  const now = Date.now();

  if (!attempt) return { allowed: true };

  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    return {
      allowed: false,
      blockedMinutes: Math.ceil(
        (attempt.blockedUntil - now) / 60000
      )
    };
  }

  if (attempt.attempts >= 5) {
    attempt.blockedUntil = now + 30 * 60 * 1000;
    loginAttempts.set(key, attempt);
    return { allowed: false, blockedMinutes: 30 };
  }

  return { allowed: true, remainingAttempts: 5 - attempt.attempts };
}

export function recordFailedAttempt(email: string) {
  const key = email.toLowerCase();
  const now = Date.now();
  const attempt = loginAttempts.get(key) ?? {
    attempts: 0,
    lastAttempt: now
  };

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

/* ===================== STUBS (API NEEDS THESE) ===================== */

export function getUserStreak(_userId: string) {
  return {
    current: 0,
    longest: 0,
    totalMedsTaken: 0,
    weeklyAdherence: 0
  };
}

export function getTodaysMedications(_userId: string) {
  return [];
}

export function getTodayMood(
  _userId: string
): { mood: 'happy' | 'neutral' | 'sad' } | null {
  return null;
}


export function getUpcomingSession(_userId: string) {
  return null;
}

export function getUserNotifications(
  _userId: string,
  _limit: number = 10
): any[] {
  return [];
}


/* ===================== MOOD ===================== */

export function logMood(
  userId: string,
  mood: 'happy' | 'neutral' | 'sad',
  note?: string
) {
  return {
    id: crypto.randomUUID(),
    userId,
    mood,
    note,
    date: new Date().toISOString().split('T')[0]
  };
}

/* ===================== MEDICATION ===================== */

export function markMedicationAsTaken(
  userId: string,
  medicationId: string,
  scheduledTime: string
) {
  const logs = loadMap<any>(MED_LOGS_FILE);
  const today = new Date().toISOString().split('T')[0];

  const logId = `${userId}_${medicationId}_${today}_${scheduledTime}`;

  logs.set(logId, {
    id: logId,
    userId,
    medicationId,
    scheduledTime,
    takenAt: new Date().toISOString(),
    date: today,
    status: 'taken'
  });

  saveMap(MED_LOGS_FILE, logs);

  return { success: true, streak: null };
}
