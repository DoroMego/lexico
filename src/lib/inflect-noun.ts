// Returns the plural form of a Spanish noun, or null if indeterminate.
export function getNounPlural(word: string): string | null {
  const w = word.toLowerCase();
  // Final stressed vowel + n loses its accent in plurals: canción → canciones.
  if (/[áéíóú]n$/.test(w)) return w.normalize('NFD').replace(/[\u0300-\u036f]/g, '') + 'es';
  if (w.endsWith('z')) return w.slice(0, -1) + 'ces';
  if (/[aeiouáéíóú]$/.test(w)) return w + 's';
  if (w.endsWith('s') || w.endsWith('x')) return null; // already plural / invariant
  return w + 'es';
}

// Explicit lexical eligibility for this public sample; spelling alone is insufficient.
const FEMININE_COUNTERPARTS = new Map<string, string>([
  ['cocinero', 'cocinera'],
  ['trabajador', 'trabajadora'],
  ['viajero', 'viajera'],
]);
export function getNounFeminine(word: string): string | null {
  return FEMININE_COUNTERPARTS.get(word.toLowerCase()) ?? null;
}
