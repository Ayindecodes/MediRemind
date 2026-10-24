import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAsServer } from '@/lib/db/client';
import {
  clearNotifications,
  listNotifications,
  markNotificationsRead,
  notify,
} from '@/lib/db/notifications';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;
let bola: TestUser;

beforeAll(async () => {
  [ada, bola] = await Promise.all([createTestUser('Ada Obi'), createTestUser('Bola Ade')]);
  const server = dbAsServer();
  await notify(server, ada.id, { type: 'refill', message: 'About 3 days of Amlodipine left' });
  await notify(server, ada.id, {
    type: 'missed',
    message: 'Your 8:00 pm dose is not marked yet',
    action_url: '/dashboard',
  });
  await notify(server, bola.id, { type: 'system', message: 'Welcome' });
});
afterAll(deleteTestUsers);

describe('notifications', () => {
  it('are listed newest first, only to their owner', async () => {
    const list = await listNotifications(ada.db, ada.id);
    expect(list.map((n) => n.type)).toEqual(['missed', 'refill']);
    expect(await listNotifications(ada.db, bola.id)).toEqual([]);
  });

  it('can be marked read, one at a time or all at once', async () => {
    const [newest] = await listNotifications(ada.db, ada.id);
    expect(await markNotificationsRead(ada.db, ada.id, [newest.id])).toBe(1);
    expect(await markNotificationsRead(ada.db, ada.id)).toBe(1);
    expect(await markNotificationsRead(ada.db, ada.id)).toBe(0);
  });

  it('can only be created by the server', async () => {
    await expect(
      notify(ada.db, bola.id, { type: 'system', message: 'Log in again', action_url: '/login' }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('can be cleared by their owner only', async () => {
    expect(await clearNotifications(ada.db, bola.id)).toBe(0);
    expect(await listNotifications(bola.db, bola.id)).toHaveLength(1);
    expect(await clearNotifications(ada.db, ada.id)).toBe(2);
    expect(await listNotifications(ada.db, ada.id)).toEqual([]);
  });
});
