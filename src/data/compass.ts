import type { GaiaState } from '../types';

/**
 * Words people reach for when the box is empty. Offered, never a menu to pick
 * from: anything typed in is as good, and nothing here is a category.
 */
const WORDS = ['Steadiness', 'Curiosity', 'Health', 'Family', 'Patience', 'Craft', 'Home', 'Kindness', 'Rest', 'Courage'];

/** A few suggestions the person hasn't already used, for an empty row. */
export function valueSuggestions(state: GaiaState, howMany = 4): string[] {
  const taken = new Set(state.compass.values.map((v) => v.word.trim().toLowerCase()));
  return WORDS.filter((w) => !taken.has(w.toLowerCase())).slice(0, howMany);
}
