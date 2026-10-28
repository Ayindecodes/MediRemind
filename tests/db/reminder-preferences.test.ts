import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAsServer } from '@/lib/db/client';
import {
  getGraceMinutes,
  getReminderPreferences,
  recordWhatsAppOptIn,
  saveReminderPreferences,
} from '@/lib/db/reminder-preferences';
import { DEFAULT_GRACE_MINUTES } from '@/lib/schedule/status';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;
let bola: TestUser;

beforeAll(async () => {
  [ada, bola] = await Promise.all([createTestUser('Ada Obi'), createTestUser('Bola Ade')]);
});
afterAll(deleteTestUsers);

describe('reminder preferences', () => {
  it("start from the database's defaults", async () => {
    expect(await getReminderPreferences(ada.db, ada.id)).toMatchObject({
      channels: ['push'],
      lead_minutes: 0,
      grace_minutes: 60,
      discreet: false,
      whatsapp_opted_in_at: null,
    });
    // Reading again doesn't create a second row
    expect((await getReminderPreferences(ada.db, ada.id)).channels).toEqual(['push']);
  });

  it('save quiet hours, timing and discreet mode', async () => {
    const saved = await saveReminderPreferences(ada.db, ada.id, {
      channels: ['push', 'sms'],
      quiet_hours_start: '22:00',
      quiet_hours_end: '06:00',
      lead_minutes: 10,
      discreet: true,
    });
    expect(saved).toMatchObject({
      channels: ['push', 'sms'],
      quiet_hours_start: '22:00:00',
      quiet_hours_end: '06:00:00',
      lead_minutes: 10,
      discreet: true,
    });
  });

  it('allow WhatsApp only after the server has recorded the opt-in', async () => {
    await expect(
      saveReminderPreferences(ada.db, ada.id, { channels: ['whatsapp'] }),
    ).rejects.toMatchObject({ code: 'invalid_request' });

    // People can't record their own opt-in
    await expect(recordWhatsAppOptIn(ada.db, ada.id)).rejects.toMatchObject({ code: 'not_found' });

    const optedIn = await recordWhatsAppOptIn(dbAsServer(), ada.id);
    expect(optedIn.whatsapp_opted_in_at).not.toBeNull();
    expect(optedIn.discreet).toBe(true); // the opt-in keeps the other settings

    const saved = await saveReminderPreferences(ada.db, ada.id, { channels: ['whatsapp', 'push'] });
    expect(saved.channels).toEqual(['whatsapp', 'push']);
  });

  it("can't be read or changed for someone else", async () => {
    await saveReminderPreferences(bola.db, bola.id, { discreet: true });
    await expect(getReminderPreferences(ada.db, bola.id)).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(
      saveReminderPreferences(ada.db, bola.id, { discreet: false }),
    ).rejects.toMatchObject({ code: 'not_found' });
    expect((await getReminderPreferences(bola.db, bola.id)).discreet).toBe(true);
  });
});

describe('getGraceMinutes', () => {
  it("is the table's default until something is saved, and saves nothing itself", async () => {
    const chidi = await createTestUser('Chidi Eze');
    expect(await getGraceMinutes(chidi.db, chidi.id)).toBe(DEFAULT_GRACE_MINUTES);
    const { data } = await chidi.db.from('notification_prefs').select('user_id');
    expect(data).toEqual([]);

    // The code's default is the table's
    expect((await getReminderPreferences(chidi.db, chidi.id)).grace_minutes).toBe(
      DEFAULT_GRACE_MINUTES,
    );
    await saveReminderPreferences(chidi.db, chidi.id, { grace_minutes: 30 });
    expect(await getGraceMinutes(chidi.db, chidi.id)).toBe(30);
  });
});
