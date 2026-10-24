// The harness itself: real sign-ins reach the database with the access rules applied
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dbAsServer } from '@/lib/db/client';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;

beforeAll(async () => {
  ada = await createTestUser('Ada Obi');
});
afterAll(deleteTestUsers);

describe('test users', () => {
  it('are signed in and see their own profile', async () => {
    const { data, error } = await ada.db.from('profiles').select('id, full_name, plan');
    expect(error).toBeNull();
    expect(data).toEqual([{ id: ada.id, full_name: 'Ada Obi', plan: 'free' }]);
  });

  it('are held to the access rules', async () => {
    const { error } = await ada.db.from('profiles').update({ plan: 'premium' }).eq('id', ada.id);
    expect(error?.code).toBe('42501');
  });

  it('are deleted with their data', async () => {
    const extra = await createTestUser('Temporary');
    await deleteTestUsers();
    const { data } = await dbAsServer().from('profiles').select('id').eq('id', extra.id);
    expect(data).toEqual([]);
    // Ada was deleted too, so make her again for anything that runs after this
    ada = await createTestUser('Ada Obi');
  });
});
