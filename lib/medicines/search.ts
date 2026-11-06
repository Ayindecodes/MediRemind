// lib/medicines/search.ts
// Finds medicines in the catalogue as someone types: by the medicine's name, a brand's, or what it's
// for. Case, accents and spacing don't matter.
import { CATALOGUE, type CatalogueEntry } from './catalogue';

export interface Suggestion extends CatalogueEntry {
  // What the typing matched: the medicine's name, one of its brands, or what it's for
  match: { on: 'name' | 'brand' | 'use'; text: string };
}

export const DEFAULT_LIMIT = 8;
export const MAX_LIMIT = 20;

// Lowercase, without accents, with one space between words and no punctuation but '/'
export function normalise(text: string): string {
  return (
    text
      .normalize('NFD')
      // Drop the accents (combining marks) that NFD split off
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9/]+/g, ' ')
      .trim()
  );
}

// Whether the typing starts the text, or starts a word in it
const startsWord = (text: string, typed: string) =>
  text.startsWith(typed) || text.includes(` ${typed}`);

// How well an entry matches: lower is better, null is not at all
function rank(
  entry: CatalogueEntry,
  typed: string,
): { score: number; match: Suggestion['match'] } | null {
  const name = normalise(entry.name);
  if (name.startsWith(typed)) return { score: 0, match: { on: 'name', text: entry.name } };

  const brand = entry.brands.find((b) => normalise(b).startsWith(typed));
  if (brand) return { score: 1, match: { on: 'brand', text: brand } };

  if (startsWord(name, typed)) return { score: 2, match: { on: 'name', text: entry.name } };
  const brandWord = entry.brands.find((b) => startsWord(normalise(b), typed));
  if (brandWord) return { score: 2, match: { on: 'brand', text: brandWord } };

  const use = entry.uses.find((u) => startsWord(normalise(u), typed));
  if (use) return { score: 3, match: { on: 'use', text: use } };

  // Part of a word, e.g. "fantrine"
  if (name.includes(typed)) return { score: 4, match: { on: 'name', text: entry.name } };
  const brandPart = entry.brands.find((b) => normalise(b).includes(typed));
  if (brandPart) return { score: 4, match: { on: 'brand', text: brandPart } };
  const usePart = entry.uses.find((u) => normalise(u).includes(typed));
  if (usePart) return { score: 5, match: { on: 'use', text: usePart } };

  return null;
}

/**
 * The medicines that match what was typed, best first: a name that starts with it, then a brand,
 * then a word in either, then what it's for. Nothing typed gives nothing: the form shows its own
 * prompt. Ties keep the catalogue's order.
 */
export function suggestMedicines(typed: string, limit = DEFAULT_LIMIT): Suggestion[] {
  const query = normalise(typed);
  if (!query) return [];

  return CATALOGUE.flatMap((entry) => {
    const ranked = rank(entry, query);
    return ranked ? [{ ...entry, match: ranked.match, score: ranked.score }] : [];
  })
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.min(Math.max(limit, 1), MAX_LIMIT))
    .map(({ score: _score, ...suggestion }) => suggestion);
}
