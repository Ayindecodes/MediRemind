import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Medication } from './types';

type Storage = typeof import('./userStorage');

let storage: Storage;
let root: string;

// userStorage finds data/ from process.cwd() when it loads, so point that at an empty temporary
// folder only while loading a fresh copy (which also resets its in-memory login rate limits)
beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mediremind-test-'));
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.resetModules();
  storage = await import('./userStorage');
  cwd.mockRestore();
});

afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(root, { recursive: true, force: true });
});

const readDataFile = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));

const MINUTE = 60 * 1000;

describe('data folder', () => {
  it('can be moved with MEDIREMIND_DATA_DIR', async () => {
    const custom = path.join(root, 'elsewhere');
    vi.stubEnv('MEDIREMIND_DATA_DIR', custom);
    vi.resetModules();
    const moved = await import('./userStorage');

    moved.createUser('Ada', 'ada@example.com', 'Passw0rdOk');
    expect(fs.existsSync(path.join(custom, 'users.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'data'))).toBe(false);
  });
});

describe('users', () => {
  it('creates an unverified free-plan user with a lowercased email and hashed password', () => {
    const user = storage.createUser('Ada Obi', 'Ada@Example.com', 'Passw0rdOk');

    expect(user).toMatchObject({ fullName: 'Ada Obi', email: 'ada@example.com', verified: false });
    expect(user.plan).toBe('free');
    expect(user.password).not.toBe('Passw0rdOk');
    expect(user.password).toMatch(/^\$2[aby]\$10\$/);
    expect(Object.keys(readDataFile('users.json'))).toEqual(['ada@example.com']);
  });

  it('refuses a second account for the same email in any letter case', () => {
    storage.createUser('Ada', 'ada@example.com', 'Passw0rdOk');
    expect(() => storage.createUser('Ada', 'ADA@example.com', 'Passw0rdOk')).toThrow(
      'Email already registered',
    );
  });

  it('checks passwords', () => {
    storage.createUser('Ada', 'ada@example.com', 'Passw0rdOk');

    expect(storage.verifyPassword('ADA@example.com', 'Passw0rdOk')).toBe(true);
    expect(storage.verifyPassword('ada@example.com', 'wrong')).toBe(false);
    expect(storage.verifyPassword('nobody@example.com', 'Passw0rdOk')).toBe(false);
  });

  it('marks a user as verified', () => {
    storage.createUser('Ada', 'ada@example.com', 'Passw0rdOk');

    expect(storage.verifyUser('Ada@Example.com')).toBe(true);
    expect(storage.getUserByEmail('ada@example.com')?.verified).toBe(true);
    expect(storage.verifyUser('nobody@example.com')).toBe(false);
  });

  it('changes the plan and its expiry', () => {
    vi.useFakeTimers({ now: new Date('2026-10-23T09:00:00Z'), toFake: ['Date'] });
    const user = storage.createUser('Ada', 'ada@example.com', 'Passw0rdOk');

    storage.updateUserPlan(user.id, 'family', 30);

    const saved = storage.getUserByEmail('ada@example.com');
    expect(saved?.plan).toBe('family');
    expect(saved?.planExpiry).toBe(Date.now() + 30 * 24 * 60 * MINUTE);
    expect(() => storage.updateUserPlan('user_missing', 'family')).toThrow('User not found');
  });
});

describe('verification codes', () => {
  it('are random 6-digit numbers', () => {
    const codes = Array.from({ length: 50 }, (_, i) =>
      storage.createVerificationSession(`user${i}@example.com`, 'login'),
    );

    for (const code of codes) expect(code).toMatch(/^[1-9]\d{5}$/);
    expect(new Set(codes).size).toBeGreaterThan(45);
  });

  it('accept the right code once, ignoring email letter case', () => {
    const code = storage.createVerificationSession('Ada@Example.com', 'login');

    expect(storage.verifyCode('ada@example.com', code, 'login')).toEqual({ valid: true });
    expect(storage.verifyCode('ada@example.com', code, 'login')).toEqual({
      valid: false,
      error: 'No session found',
    });
  });

  it('never let a signup code complete a login, or the reverse', () => {
    const code = storage.createVerificationSession('ada@example.com', 'signup');

    expect(storage.verifyCode('ada@example.com', code, 'login').valid).toBe(false);
    // The rejected attempt doesn't use up the code for its real purpose
    expect(storage.verifyCode('ada@example.com', code, 'signup').valid).toBe(true);
  });

  it('expire after 15 minutes', () => {
    vi.useFakeTimers({ now: new Date('2026-10-23T09:00:00Z'), toFake: ['Date'] });
    const code = storage.createVerificationSession('ada@example.com', 'login');

    vi.setSystemTime(Date.now() + 15 * MINUTE + 1);
    expect(storage.verifyCode('ada@example.com', code, 'login')).toEqual({
      valid: false,
      error: 'Code expired',
    });
  });

  it('still accept the right code after 4 wrong guesses', () => {
    const code = storage.createVerificationSession('ada@example.com', 'login');
    for (let i = 0; i < 4; i++) {
      expect(storage.verifyCode('ada@example.com', '000000', 'login').error).toBe('Invalid code');
    }

    expect(storage.verifyCode('ada@example.com', code, 'login').valid).toBe(true);
  });

  it('are burned by the 5th wrong guess', () => {
    const code = storage.createVerificationSession('ada@example.com', 'login');
    for (let i = 0; i < 4; i++) storage.verifyCode('ada@example.com', '000000', 'login');

    expect(storage.verifyCode('ada@example.com', '000000', 'login').error).toBe(
      'Too many incorrect attempts. Please request a new code.',
    );
    expect(storage.verifyCode('ada@example.com', code, 'login').error).toBe('No session found');
  });

  it('are replaced when a new code is requested', () => {
    const first = storage.createVerificationSession('ada@example.com', 'login');
    const second = storage.createVerificationSession('ada@example.com', 'login');

    if (first !== second) {
      expect(storage.verifyCode('ada@example.com', first, 'login').valid).toBe(false);
    }
    expect(storage.verifyCode('ada@example.com', second, 'login').valid).toBe(true);
  });
});

describe('login rate limit', () => {
  it('allows logins with no failed attempts', () => {
    expect(storage.checkRateLimit('ada@example.com')).toEqual({ allowed: true });
  });

  it('counts down the remaining attempts', () => {
    storage.recordFailedAttempt('ada@example.com');
    storage.recordFailedAttempt('ADA@example.com');

    expect(storage.checkRateLimit('ada@example.com')).toEqual({
      allowed: true,
      remainingAttempts: 3,
    });
  });

  it('blocks an email for 30 minutes after 5 failures, and only that email', () => {
    vi.useFakeTimers({ now: new Date('2026-10-23T09:00:00Z'), toFake: ['Date'] });
    for (let i = 0; i < 5; i++) storage.recordFailedAttempt('ada@example.com');

    expect(storage.checkRateLimit('ada@example.com')).toEqual({
      allowed: false,
      blockedMinutes: 30,
    });
    expect(storage.checkRateLimit('bola@example.com').allowed).toBe(true);

    vi.setSystemTime(Date.now() + 30 * MINUTE);
    expect(storage.checkRateLimit('ada@example.com').allowed).toBe(true);
  });

  it('starts a fresh count once a block has expired', () => {
    vi.useFakeTimers({ now: new Date('2026-10-23T09:00:00Z'), toFake: ['Date'] });
    for (let i = 0; i < 5; i++) storage.recordFailedAttempt('ada@example.com');
    vi.setSystemTime(Date.now() + 30 * MINUTE);

    expect(storage.checkRateLimit('ada@example.com')).toEqual({ allowed: true });

    // One wrong password after the block shouldn't lock the account for another 30 minutes
    storage.recordFailedAttempt('ada@example.com');
    expect(storage.checkRateLimit('ada@example.com')).toEqual({
      allowed: true,
      remainingAttempts: 4,
    });
  });

  it('forgets failures after a successful login', () => {
    for (let i = 0; i < 4; i++) storage.recordFailedAttempt('ada@example.com');
    storage.resetAttempts('Ada@Example.com');

    expect(storage.checkRateLimit('ada@example.com')).toEqual({ allowed: true });
  });
});

describe('medications', () => {
  const medication = (name: string): Omit<Medication, 'id' | 'userId'> => ({
    name,
    dosage: '5mg',
    frequency: 'twice_daily',
    times: ['08:00', '20:00'],
    color: 'from-blue-500 to-cyan-500',
    icon: '💊',
    startDate: '2026-10-01',
    reminders: true,
  });

  it('are stored per user and only returned to their owner', () => {
    storage.addMedication('user_a', medication('Amlodipine'));
    storage.addMedication('user_b', medication('Insulin'));

    expect(storage.getUserMedications('user_a').map((m) => m.name)).toEqual(['Amlodipine']);
    expect(storage.getUserMedications('user_a')[0]).toMatchObject({
      userId: 'user_a',
      id: expect.stringMatching(/^med_/),
    });
  });

  it('can only be deleted by their owner', () => {
    const med = storage.addMedication('user_a', medication('Amlodipine'));

    expect(storage.deleteMedication('user_b', med.id)).toBeNull();
    expect(storage.getUserMedications('user_a')).toHaveLength(1);

    expect(storage.deleteMedication('user_a', med.id)?.name).toBe('Amlodipine');
    expect(storage.getUserMedications('user_a')).toHaveLength(0);
    expect(storage.deleteMedication('user_a', med.id)).toBeNull();
  });

  it('keep their dose history when deleted', () => {
    const med = storage.addMedication('user_a', medication('Amlodipine'));
    storage.markMedicationAsTaken('user_a', med.id, '08:00');

    storage.deleteMedication('user_a', med.id);
    expect(Object.keys(readDataFile('medication_logs.json'))).toHaveLength(1);
  });

  it('list one dose per scheduled time today, and record doses taken', () => {
    vi.useFakeTimers({ now: new Date('2026-10-23T09:00:00Z'), toFake: ['Date'] });
    const med = storage.addMedication('user_a', medication('Amlodipine'));

    expect(storage.getTodaysMedications('user_a').map((d) => [d.time, d.status])).toEqual([
      ['08:00', 'upcoming'],
      ['20:00', 'upcoming'],
    ]);

    storage.markMedicationAsTaken('user_a', med.id, '08:00');
    const [morning, evening] = storage.getTodaysMedications('user_a');
    expect(morning).toMatchObject({ status: 'taken', takenAt: '2026-10-23T09:00:00.000Z' });
    expect(morning.id).toBe(`user_a_${med.id}_2026-10-23_08:00`);
    expect(evening.status).toBe('upcoming');
  });
});

describe('moods', () => {
  it('keep one mood per user per day, replacing earlier ones', () => {
    vi.useFakeTimers({ now: new Date('2026-10-23T09:00:00Z'), toFake: ['Date'] });
    storage.logMood('user_a', 'sad');
    storage.logMood('user_a', 'happy', 'Feeling better');

    expect(storage.getTodayMood('user_a')).toMatchObject({ mood: 'happy', note: 'Feeling better' });
    expect(storage.getTodayMood('user_b')).toBeNull();
  });
});

describe('notifications', () => {
  it("returns a user's notifications, newest first, up to the limit", () => {
    vi.useFakeTimers({ now: new Date('2026-10-23T09:00:00Z'), toFake: ['Date'] });
    for (const message of ['first', 'second', 'third']) {
      storage.createNotification('user_a', { type: 'reminder', message });
      vi.setSystemTime(Date.now() + MINUTE);
    }
    storage.createNotification('user_b', { type: 'reminder', message: 'not yours' });

    const notifications = storage.getUserNotifications('user_a', 2);
    expect(notifications.map((n) => n.message)).toEqual(['third', 'second']);
    expect(notifications[0]).toMatchObject({ userId: 'user_a', read: false });
  });
});
