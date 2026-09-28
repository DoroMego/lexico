import { Word } from './types';

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const LEVEL_ORDER: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

function score(
  w: Word,
  qRaw: string,
  qNorm: string,
  adjBaseNorm: string | null,
  nounBaseNorm: string | null,
): number {
  const sp = norm(w.spanish);
  const en = w.english.toLowerCase();
  const zh = w.chinese;
  const levelBonus = (LEVEL_ORDER[w.level] ?? 3) * 0.01;

  if (sp === qNorm) return 0 + levelBonus;
  if (adjBaseNorm !== null && sp === adjBaseNorm) return 1 + levelBonus;
  if (nounBaseNorm !== null && sp === nounBaseNorm) return 1 + levelBonus;
  if (sp.startsWith(qNorm)) return 2 + levelBonus;
  if (sp.includes(qNorm)) return 3 + levelBonus;
  if (en === qRaw) return 4 + levelBonus;
  if (en.startsWith(qRaw)) return 5 + levelBonus;
  if (en.includes(qRaw)) return 6 + levelBonus;
  if (zh.includes(qRaw)) return 7 + levelBonus;
  return 99;
}

export function rankResults(
  words: Word[],
  query: string,
  adjBaseNorm: string | null,
  nounBaseNorm: string | null = null,
): Word[] {
  const qRaw = query.toLowerCase();
  const qNorm = norm(qRaw);
  return words
    .map(w => ({ w, s: score(w, qRaw, qNorm, adjBaseNorm, nounBaseNorm) }))
    .sort((a, b) => a.s - b.s || a.w.spanish.localeCompare(b.w.spanish))
    .map(x => x.w);
}
