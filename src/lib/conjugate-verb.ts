// Ties the pure engine to the irregular-verb data + dictionary.
// UI calls this; the engine itself stays data-free and testable.

import { conjugate, type Conjugation, type Group } from '@/lib/conjugation';
import { IRREGULARS } from '@/data/irregular-verbs';

function isInfinitive(word: string): word is `${string}${Group}` {
  const end = word.slice(-2);
  return end === 'ar' || end === 'er' || end === 'ir';
}

/** Returns the full conjugation, or null if the word isn't a conjugatable verb. */
export function conjugateInfinitive(infinitive: string): Conjugation | null {
  if (!isInfinitive(infinitive)) return null;
  return conjugate(infinitive, IRREGULARS[infinitive]);
}

/** Whether this verb has any irregular cell at all (for a badge in the UI). */
export function isIrregular(infinitive: string): boolean {
  return infinitive in IRREGULARS;
}
