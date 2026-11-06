import { describe, expect, it } from 'vitest';
import { normalise, suggestMedicines } from './search';

const names = (typed: string, limit?: number) =>
  suggestMedicines(typed, limit).map((suggestion) => suggestion.name);

describe('normalise', () => {
  it('ignores case, accents, punctuation and spacing', () => {
    expect(normalise('  Coartém,  (20 mg/120 mg) ')).toBe('coartem 20 mg/120 mg');
  });
});

describe('suggestMedicines', () => {
  it('finds a medicine by the start of its name, best first', () => {
    expect(names('amlo')).toEqual(['Amlodipine']);
    expect(names('Para')[0]).toBe('Paracetamol');
  });

  it('finds a medicine by a brand, and says which', () => {
    const [lonart] = suggestMedicines('lonart');
    expect(lonart.name).toBe('Artemether and lumefantrine');
    expect(lonart.match).toEqual({ on: 'brand', text: 'Lonart' });
    expect(names('augmentin')).toEqual(['Amoxicillin and clavulanic acid']);
  });

  it('finds medicines by what they are for', () => {
    const malaria = suggestMedicines('malaria', 20);
    expect(malaria.map((s) => s.name)).toContain('Artemether and lumefantrine');
    expect(malaria.every((s) => s.match.on === 'use')).toBe(true);
    expect(names('blood pressure', 20)).toContain('Amlodipine');
  });

  it('puts names that start with it first, then brands, then words inside names', () => {
    const am = suggestMedicines('am', 20).map((s) => `${s.match.on}:${s.name}`);
    const lastNameStart = am.lastIndexOf('name:Amitriptyline');
    const amaryl = am.indexOf('brand:Glimepiride'); // Amaryl
    const amodiaquine = am.indexOf('name:Artesunate and amodiaquine'); // a word start
    expect(am.slice(0, lastNameStart + 1).every((s) => s.startsWith('name:Am'))).toBe(true);
    expect(lastNameStart).toBeLessThan(amaryl);
    expect(amaryl).toBeLessThan(amodiaquine);
  });

  it('finds a word inside a name, then part of a word', () => {
    expect(names('lumefantrine')).toEqual(['Artemether and lumefantrine']);
    expect(names('fantrine')).toEqual(['Artemether and lumefantrine']);
  });

  it('ignores case, accents and stray spaces in the typing', () => {
    expect(names('  LONART ')).toEqual(['Artemether and lumefantrine']);
    expect(names('coartém')).toEqual(['Artemether and lumefantrine']);
  });

  it('gives 8 unless asked for more, up to 20', () => {
    expect(suggestMedicines('a')).toHaveLength(8);
    expect(suggestMedicines('a', 15)).toHaveLength(15);
    expect(suggestMedicines('a', 100)).toHaveLength(20);
    expect(suggestMedicines('a', 0)).toHaveLength(1);
  });

  it('gives nothing for nothing, and for something it has never heard of', () => {
    expect(suggestMedicines('')).toEqual([]);
    expect(suggestMedicines('   ')).toEqual([]);
    expect(suggestMedicines('xyzzy')).toEqual([]);
  });

  it('carries the catalogue entry, course included', () => {
    const [coartem] = suggestMedicines('coartem');
    expect(coartem).toMatchObject({
      brands: ['Coartem', 'Lonart', 'Amatem', 'Lumartem'],
      forms: ['tablet'],
      course: { type: 'course', firstDose: '08:00', offsetsHours: [0, 8, 24, 36, 48, 60] },
      group: 'malaria',
    });
    expect(coartem).not.toHaveProperty('score');
  });
});
