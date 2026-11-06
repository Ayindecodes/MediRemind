import { describe, expect, it } from 'vitest';
import { scheduleSchema } from '@/lib/schedule/schema';
import { MEDICINE_FORMS } from '@/lib/validation/medicines';
import { CATALOGUE, GROUPS } from './catalogue';

// Keeps the list usable as it grows: every entry complete, nothing listed twice
describe('the medicine catalogue', () => {
  it('has a good number of medicines, each in a known group', () => {
    expect(CATALOGUE.length).toBeGreaterThanOrEqual(90);
    for (const entry of CATALOGUE) expect(GROUPS).toContain(entry.group);
  });

  it('names each medicine once', () => {
    const names = CATALOGUE.map((entry) => entry.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('lists each brand once, and never as a medicine name', () => {
    const brands = CATALOGUE.flatMap((entry) => entry.brands.map((brand) => brand.toLowerCase()));
    expect(new Set(brands).size).toBe(brands.length);
    const names = new Set(CATALOGUE.map((entry) => entry.name.toLowerCase()));
    for (const brand of brands) expect(names.has(brand)).toBe(false);
  });

  it('gives every medicine a form the app knows, an example strength and a use', () => {
    for (const entry of CATALOGUE) {
      expect(entry.forms.length, entry.name).toBeGreaterThan(0);
      for (const form of entry.forms) expect(MEDICINE_FORMS, entry.name).toContain(form);
      expect(entry.strengths.length, entry.name).toBeGreaterThan(0);
      expect(entry.uses.length, entry.name).toBeGreaterThan(0);
      for (const text of [entry.name, ...entry.brands, ...entry.strengths, ...entry.uses]) {
        expect(text.trim(), entry.name).toBe(text);
        expect(text.length, entry.name).toBeGreaterThan(0);
      }
    }
  });

  it('only attaches a course where the schedule engine accepts it', () => {
    const withCourse = CATALOGUE.filter((entry) => entry.course);
    expect(withCourse.length).toBeGreaterThan(0);
    for (const entry of withCourse) {
      expect(scheduleSchema.parse(entry.course).type, entry.name).toBe('course');
    }
  });
});
