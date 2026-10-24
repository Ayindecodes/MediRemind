import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMedication,
  archiveMedication,
  getMedication,
  listMedications,
  restoreMedication,
  updateMedication,
  type NewMedication,
} from '@/lib/db/medications';
import { createTestUser, deleteTestUsers, type TestUser } from './helpers';

let ada: TestUser;
let bola: TestUser;

beforeAll(async () => {
  [ada, bola] = await Promise.all([
    createTestUser('Ada Obi'),
    createTestUser('Bola Ade', { plan: 'premium' }),
  ]);
});
afterAll(deleteTestUsers);

const medicine = (name: string, extra: Partial<NewMedication> = {}): NewMedication => ({
  name,
  strength: '5 mg',
  schedule: { type: 'daily', times: ['08:00'] },
  start_date: '2026-10-01',
  ...extra,
});

describe('medications', () => {
  it('can be added, listed and read by their owner only', async () => {
    const amlodipine = await addMedication(ada.db, ada.id, medicine('Amlodipine'));
    expect(amlodipine).toMatchObject({
      user_id: ada.id,
      name: 'Amlodipine',
      form: 'tablet',
      dose_amount: 1,
    });

    expect((await listMedications(ada.db, ada.id)).map((m) => m.name)).toEqual(['Amlodipine']);
    expect(await getMedication(bola.db, amlodipine.id)).toBeNull();
    expect(await listMedications(bola.db, ada.id)).toEqual([]);
  });

  it("can't be added to someone else's list", async () => {
    await expect(addMedication(ada.db, bola.id, medicine('Planted'))).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('can be edited by their owner only', async () => {
    const [amlodipine] = await listMedications(ada.db, ada.id);
    const edited = await updateMedication(ada.db, amlodipine.id, { notes: 'after food' });
    expect(edited.notes).toBe('after food');

    await expect(
      updateMedication(bola.db, amlodipine.id, { notes: 'changed' }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it("stop at the free plan's 3 active medicines, with the database's message", async () => {
    await addMedication(ada.db, ada.id, medicine('Metformin'));
    await addMedication(ada.db, ada.id, medicine('Atorvastatin'));

    await expect(addMedication(ada.db, ada.id, medicine('Lisinopril'))).rejects.toMatchObject({
      code: 'upgrade_required',
      message: 'The free plan allows 3 active medicines. Archive one or upgrade to add more.',
    });
  });

  it('can be archived to free a place, and restored only when there is room', async () => {
    const atorvastatin = (await listMedications(ada.db, ada.id)).find(
      (m) => m.name === 'Atorvastatin',
    )!;
    const archived = await archiveMedication(ada.db, atorvastatin.id);
    expect(archived.archived_at).not.toBeNull();
    expect((await listMedications(ada.db, ada.id)).map((m) => m.name)).not.toContain(
      'Atorvastatin',
    );
    expect((await listMedications(ada.db, ada.id, { archived: true })).map((m) => m.name)).toEqual([
      'Atorvastatin',
    ]);

    await addMedication(ada.db, ada.id, medicine('Lisinopril'));
    await expect(restoreMedication(ada.db, atorvastatin.id)).rejects.toMatchObject({
      code: 'upgrade_required',
    });
  });

  it('have no limit on a paid plan', async () => {
    for (const name of ['A', 'B', 'C', 'D', 'E'])
      await addMedication(bola.db, bola.id, medicine(name));
    expect(await listMedications(bola.db, bola.id)).toHaveLength(5);
  });

  it('refuse values the table does not allow', async () => {
    await expect(
      addMedication(bola.db, bola.id, medicine('Bad', { end_date: '2026-09-01' })),
    ).rejects.toMatchObject({ code: 'invalid_request' });
  });
});
