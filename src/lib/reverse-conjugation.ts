import { conjugateInfinitive } from '@/lib/conjugate-verb';
import { PERSONS, TENSES, type Person } from '@/lib/conjugation';
import rawWordbank from '@/data/wordbank.json';

type WbEntry = { spanish: string; pos: string };
const wordbank = rawWordbank as WbEntry[];

const PERSON_ZH: Record<Person, string> = {
  yo: '第一人称单数',
  tu: '第二人称单数',
  el: '第三人称单数',
  nosotros: '第一人称复数',
  vosotros: '第二人称复数',
  ellos: '第三人称复数',
};

export interface ReverseMatch {
  infinitive: string;
  banner: string;
}

let verbCache: Array<{ spanish: string }> | null = null;

function getVerbs() {
  if (!verbCache) verbCache = wordbank.filter((w) => w.pos === 'verb');
  return verbCache;
}

export function reverseConjugationLookup(form: string): ReverseMatch | null {
  const target = form.toLowerCase().trim();
  if (target.length < 2) return null;

  for (const entry of getVerbs()) {
    const infinitive = entry.spanish;
    const conj = conjugateInfinitive(infinitive);
    if (!conj) continue;

    if (conj.gerundio.form === target) {
      return { infinitive, banner: `${form} 是 ${infinitive} 的副动词（gerundio）` };
    }
    if (conj.participio.form === target) {
      return { infinitive, banner: `${form} 是 ${infinitive} 的过去分词（participio）` };
    }

    for (const meta of TENSES) {
      if (meta.compound) continue;
      const cells = conj.tenses[meta.tense];
      if (!cells) continue;
      for (const person of PERSONS) {
        const cell = cells[person];
        if (cell?.form === target) {
          return {
            infinitive,
            banner: `${form} 是 ${infinitive} 的${meta.zh}${PERSON_ZH[person]}变位`,
          };
        }
      }
    }
  }
  return null;
}
