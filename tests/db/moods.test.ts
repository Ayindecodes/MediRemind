import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getMood, logMood } from '@/lib/db/moods';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;
let bola: TestUser;

beforeAll(async () => {
  [ada, bola] = await Promise.all([createTestUser('Ada Obi'), createTestUser('Bola Ade')]);
});
afterAll(deleteTestUsers);

describe('moods', () => {
  it('are logged once per day, choosing again replaces the mood', async () => {
    await logMood(ada.db, ada.id, { day: '2026-10-24', mood: 'neutral' });
    const changed = await logMood(ada.db, ada.id, {
      day: '2026-10-24',
      mood: 'sad',
      note: 'long day',
    });
    expect(changed).toMatchObject({ logged_on: '2026-10-24', mood: 'sad', note: 'long day' });
    expect(await getMood(ada.db, ada.id, '2026-10-24')).toMatchObject({ mood: 'sad' });
  });

  it('are null on a day without a check-in', async () => {
    expect(await getMood(ada.db, ada.id, '2026-10-01')).toBeNull();
  });

  it("are private: nobody reads or writes someone else's", async () => {
    await logMood(bola.db, bola.id, { day: '2026-10-24', mood: 'happy', note: 'private' });
    expect(await getMood(ada.db, bola.id, '2026-10-24')).toBeNull();
    await expect(
      logMood(ada.db, bola.id, { day: '2026-10-25', mood: 'sad' }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
