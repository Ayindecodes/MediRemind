import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbError } from '@/lib/db/errors';
import { getProfile, updateProfile } from '@/lib/db/profiles';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;
let bola: TestUser;

beforeAll(async () => {
  [ada, bola] = await Promise.all([createTestUser('Ada Obi'), createTestUser('Bola Ade')]);
});
afterAll(deleteTestUsers);

describe('getProfile', () => {
  it('returns your own profile', async () => {
    expect(await getProfile(ada.db, ada.id)).toMatchObject({
      id: ada.id,
      full_name: 'Ada Obi',
      timezone: 'Africa/Lagos',
      plan: 'free',
    });
  });

  it("returns null for someone else's, as if it didn't exist", async () => {
    expect(await getProfile(ada.db, bola.id)).toBeNull();
  });
});

describe('updateProfile', () => {
  it('saves your name, time zone and language', async () => {
    const profile = await updateProfile(ada.db, ada.id, {
      full_name: 'Ada Obi-Eze',
      timezone: 'Europe/London',
      language: 'pcm',
    });
    expect(profile).toMatchObject({
      full_name: 'Ada Obi-Eze',
      timezone: 'Europe/London',
      language: 'pcm',
    });
  });

  it("can't touch someone else's profile", async () => {
    await expect(updateProfile(ada.db, bola.id, { full_name: 'Changed' })).rejects.toMatchObject({
      code: 'not_found',
    });
    expect((await getProfile(bola.db, bola.id))?.full_name).toBe('Bola Ade');
  });

  it('refuses a time zone that does not exist', async () => {
    const error = await updateProfile(ada.db, ada.id, { timezone: 'Africa/Lagoss' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(DbError);
    expect(error).toMatchObject({ code: 'invalid_request' });
  });
});
