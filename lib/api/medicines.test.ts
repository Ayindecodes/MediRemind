import { describe, expect, it } from 'vitest';
import type { MedicationRow } from '@/lib/db/medications';
import { endDateFor, toColumns, toMedicine } from './medicines';

const LAGOS = 'Africa/Lagos';
// Noon in Lagos on 20 October
const NOW = new Date('2026-10-20T12:00:00+01:00');

const row = (changes: Partial<MedicationRow> = {}): MedicationRow => ({
  id: '3f1c2a9e-5b7d-4c8e-9a1f-2b3c4d5e6f70',
  user_id: '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a',
  name: 'Amlodipine',
  strength: '5 mg',
  form: 'tablet',
  dose_amount: 1,
  dose_unit: 'tablet',
  schedule: { type: 'daily', times: ['08:00', '20:00'] },
  start_date: '2026-10-01',
  end_date: null,
  instructions: null,
  notes: null,
  appearance: { shape: 'round', color: 'white' },
  photo_path: null,
  nafdac_number: 'A4-1234',
  quantity_remaining: 28,
  refill_alert_days: 7,
  reminder_channels: null,
  paused_at: null,
  archived_at: null,
  created_at: '2026-10-01T09:00:00+00:00',
  updated_at: '2026-10-01T09:00:00+00:00',
  ...changes,
});

describe('toMedicine', () => {
  it('gives the medicine with its status and next dose', () => {
    expect(toMedicine(row(), LAGOS, NOW)).toEqual({
      id: '3f1c2a9e-5b7d-4c8e-9a1f-2b3c4d5e6f70',
      name: 'Amlodipine',
      strength: '5 mg',
      form: 'tablet',
      doseAmount: 1,
      doseUnit: 'tablet',
      schedule: { type: 'daily', times: ['08:00', '20:00'] },
      startDate: '2026-10-01',
      endDate: null,
      instructions: null,
      notes: null,
      appearance: { shape: 'round', color: 'white' },
      nafdacNumber: 'A4-1234',
      quantityRemaining: 28,
      refillAlertDays: 7,
      reminderChannels: null,
      status: 'active',
      nextDose: { scheduledFor: '2026-10-20T19:00:00.000Z', date: '2026-10-20', time: '20:00' },
      pausedAt: null,
      archivedAt: null,
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
    });
  });

  it('gives the first dose of a medicine that starts later', () => {
    expect(toMedicine(row({ start_date: '2026-11-01' }), LAGOS, NOW).nextDose?.date).toBe(
      '2026-11-01',
    );
  });

  it('gives no next dose when none will come', () => {
    const none = (changes: Partial<MedicationRow>) => toMedicine(row(changes), LAGOS, NOW).nextDose;
    expect(none({ schedule: { type: 'as_needed' } })).toBeNull();
    expect(none({ end_date: '2026-10-19' })).toBeNull();
    expect(none({ paused_at: '2026-10-19T12:00:00+00:00' })).toBeNull();
    expect(none({ archived_at: '2026-10-19T12:00:00+00:00' })).toBeNull();
  });
});

describe('endDateFor', () => {
  it('refuses an end date before the start', () => {
    expect(() => endDateFor(undefined, '2026-10-20', '2026-10-19', LAGOS)).toThrow(
      "The end date can't be before the start date.",
    );
    expect(endDateFor(undefined, '2026-10-20', '2026-10-20', LAGOS)).toBe('2026-10-20');
  });
});

describe('toColumns', () => {
  it('sends only the fields given, so the rest stay as they are', () => {
    const columns = toColumns({ notes: 'With water', endDate: null, doseAmount: 2 });
    expect(JSON.parse(JSON.stringify(columns))).toEqual({
      notes: 'With water',
      end_date: null,
      dose_amount: 2,
    });
  });
});
