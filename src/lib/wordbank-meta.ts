import wordbank from '@/data/wordbank.json';
import { inflectAdjective } from './inflect-adjective';
import { getNounFeminine, getNounPlural } from './inflect-noun';

export type Frequency = 'high' | 'mid' | 'low';

export interface FamilyMember {
  spanish: string;
  pos: string;
  chinese: string;
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const freqMap = new Map<string, Frequency>();
const familyMap = new Map<string, string[]>();
const metaMap = new Map<string, { pos: string; chinese: string }>();
const adjInflectionMap = new Map<string, string>();
const nounInflectionMap = new Map<string, string>();

type WBEntry = { spanish: string; frequency?: string; family?: string[]; pos?: string; chinese?: string; gender?: string };

for (const entry of wordbank as WBEntry[]) {
  const key = entry.spanish.toLowerCase();
  if (entry.frequency) freqMap.set(key, entry.frequency as Frequency);
  if (entry.family?.length) familyMap.set(key, entry.family);
  if (entry.pos && entry.chinese) metaMap.set(key, { pos: entry.pos, chinese: entry.chinese });

  if (entry.pos === 'adjective') {
    const forms = inflectAdjective(entry.spanish);
    if (forms) {
      const baseNorm = norm(entry.spanish);
      for (const f of [forms.fSg, forms.mPl, forms.fPl]) {
        const fn = norm(f);
        if (fn !== baseNorm && !adjInflectionMap.has(fn)) adjInflectionMap.set(fn, entry.spanish);
      }
    }
  }

  if (entry.pos === 'noun') {
    const baseNorm = norm(entry.spanish);
    const addForm = (f: string | null) => {
      if (!f) return;
      const fn = norm(f);
      if (fn !== baseNorm && !nounInflectionMap.has(fn)) nounInflectionMap.set(fn, entry.spanish);
    };
    // plural
    const pl = getNounPlural(entry.spanish);
    addForm(pl);
    // Feminine counterparts require explicit lexical eligibility, not spelling.
    if (entry.gender === 'm') {
      const fem = getNounFeminine(entry.spanish);
      addForm(fem);
      // feminine plural
      if (fem) addForm(getNounPlural(fem));
    }
  }
}

export function getFrequency(spanish: string): Frequency | null {
  return freqMap.get(spanish.toLowerCase()) ?? null;
}

export function getFamily(spanish: string): string[] | null {
  return familyMap.get(spanish.toLowerCase()) ?? null;
}

/** If `query` is an inflected adjective form, returns the canonical base word. */
export function getAdjectiveBase(query: string): string | null {
  return adjInflectionMap.get(norm(query)) ?? null;
}

/** If `query` is an inflected noun form (plural or feminine), returns the canonical base word. */
export function getNounBase(query: string): string | null {
  return nounInflectionMap.get(norm(query)) ?? null;
}

export function getFamilyDetails(spanish: string): FamilyMember[] | null {
  const members = familyMap.get(spanish.toLowerCase());
  if (!members?.length) return null;
  return members.map((s) => {
    const meta = metaMap.get(s.toLowerCase());
    return { spanish: s, pos: meta?.pos ?? '', chinese: meta?.chinese ?? '' };
  });
}
