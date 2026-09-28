// Spanish conjugation engine (变位引擎).
//
// Pure & dependency-free on purpose: no imports, no I/O, no app aliases —
// so it runs standalone under `node --experimental-strip-types` for tests.
//
// Core idea (用户定稿): for every tense and every person, compute the form the
// REGULAR rule would produce, then compare it against the verb's actual form.
//   - same  → the cell is `regular: true`   (UI shows "regular", see 视图 A 规则页)
//   - differ→ the cell is `regular: false`  (UI writes out just that special form)
// This auto-handles "only the yo form is special" (e.g. hacer → hago, rest regular).

// ---- Persons ---------------------------------------------------------------

export const PERSONS = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'] as const;
export type Person = (typeof PERSONS)[number];

export const PERSON_LABELS: Record<Person, string> = {
  yo: 'yo',
  tu: 'tú',
  el: 'él/ella/Ud.',
  nosotros: 'nosotros',
  vosotros: 'vosotros',
  ellos: 'ellos/Uds.',
};

// ---- Tenses ----------------------------------------------------------------

export type Mood = 'indicativo' | 'subjuntivo' | 'imperativo' | 'noPersonal';

export type Tense =
  | 'presente'
  | 'preteritoImperfecto'
  | 'preteritoIndefinido'
  | 'futuro'
  | 'condicional'
  | 'presentePerfecto'
  | 'pluscuamperfecto'
  | 'futuroPerfecto'
  | 'condicionalPerfecto'
  | 'presenteProgresivo'
  | 'presenteSubj'
  | 'imperfectoSubj'
  | 'perfectoSubj'
  | 'pluscuamperfectoSubj'
  | 'imperativoAfirmativo'
  | 'imperativoNegativo';

export interface TenseMeta {
  tense: Tense;
  mood: Mood;
  es: string;
  zh: string;
  /** Compound = auxiliary (haber/estar) + participle/gerund. */
  compound: boolean;
}

/** Display order + bilingual labels for every tense the engine produces. */
export const TENSES: TenseMeta[] = [
  { tense: 'presente', mood: 'indicativo', es: 'Presente', zh: '直陈式现在时', compound: false },
  { tense: 'preteritoImperfecto', mood: 'indicativo', es: 'Pretérito imperfecto', zh: '过去未完成时', compound: false },
  { tense: 'preteritoIndefinido', mood: 'indicativo', es: 'Pretérito indefinido', zh: '简单过去时', compound: false },
  { tense: 'futuro', mood: 'indicativo', es: 'Futuro simple', zh: '简单将来时', compound: false },
  { tense: 'condicional', mood: 'indicativo', es: 'Condicional simple', zh: '条件式', compound: false },
  { tense: 'presenteProgresivo', mood: 'indicativo', es: 'Presente progresivo', zh: '现在进行时', compound: true },
  { tense: 'presentePerfecto', mood: 'indicativo', es: 'Pretérito perfecto', zh: '现在完成时', compound: true },
  { tense: 'pluscuamperfecto', mood: 'indicativo', es: 'Pluscuamperfecto', zh: '过去完成时', compound: true },
  { tense: 'futuroPerfecto', mood: 'indicativo', es: 'Futuro perfecto', zh: '将来完成时', compound: true },
  { tense: 'condicionalPerfecto', mood: 'indicativo', es: 'Condicional perfecto', zh: '条件式完成时', compound: true },
  { tense: 'presenteSubj', mood: 'subjuntivo', es: 'Presente', zh: '虚拟式现在时', compound: false },
  { tense: 'imperfectoSubj', mood: 'subjuntivo', es: 'Imperfecto (-ra)', zh: '虚拟式过去未完成时', compound: false },
  { tense: 'perfectoSubj', mood: 'subjuntivo', es: 'Pretérito perfecto', zh: '虚拟式现在完成时', compound: true },
  { tense: 'pluscuamperfectoSubj', mood: 'subjuntivo', es: 'Pluscuamperfecto', zh: '虚拟式过去完成时', compound: true },
  { tense: 'imperativoAfirmativo', mood: 'imperativo', es: 'Afirmativo', zh: '肯定命令式', compound: false },
  { tense: 'imperativoNegativo', mood: 'imperativo', es: 'Negativo', zh: '否定命令式', compound: false },
];

// ---- Result shape ----------------------------------------------------------

export interface Cell {
  form: string;
  /** true = follows the regular rule (UI may collapse to "regular"). */
  regular: boolean;
}

export type Group = 'ar' | 'er' | 'ir';

export interface Conjugation {
  infinitivo: string;
  group: Group;
  gerundio: Cell;
  participio: Cell;
  /** Imperative tenses omit `yo`; all others have all six persons. */
  tenses: Record<Tense, Partial<Record<Person, Cell>>>;
}

/**
 * Irregularities for one verb. Only store what differs from the rule — regular
 * cells are filled in by the engine. `forms` overrides apply to SYNTHETIC
 * (simple) tenses; compound tenses derive from the participle/gerund + haber.
 */
export interface IrregularSpec {
  /** Irregular stem for futuro + condicional (e.g. tener → 'tendr'). */
  futureStem?: string;
  /** Irregular past participle (e.g. hacer → 'hecho'). */
  participio?: string;
  /** Irregular gerund (e.g. decir → 'diciendo'). */
  gerundio?: string;
  /** Per-person overrides for simple tenses. */
  forms?: Partial<Record<Tense, Partial<Record<Person, string>>>>;
}

// ---- Regular ending tables -------------------------------------------------

export type Endings = Record<Person, string>;

const PRESENTE: Record<Group, Endings> = {
  ar: { yo: 'o', tu: 'as', el: 'a', nosotros: 'amos', vosotros: 'áis', ellos: 'an' },
  er: { yo: 'o', tu: 'es', el: 'e', nosotros: 'emos', vosotros: 'éis', ellos: 'en' },
  ir: { yo: 'o', tu: 'es', el: 'e', nosotros: 'imos', vosotros: 'ís', ellos: 'en' },
};
const IMPERFECTO: Record<Group, Endings> = {
  ar: { yo: 'aba', tu: 'abas', el: 'aba', nosotros: 'ábamos', vosotros: 'abais', ellos: 'aban' },
  er: { yo: 'ía', tu: 'ías', el: 'ía', nosotros: 'íamos', vosotros: 'íais', ellos: 'ían' },
  ir: { yo: 'ía', tu: 'ías', el: 'ía', nosotros: 'íamos', vosotros: 'íais', ellos: 'ían' },
};
const INDEFINIDO: Record<Group, Endings> = {
  ar: { yo: 'é', tu: 'aste', el: 'ó', nosotros: 'amos', vosotros: 'asteis', ellos: 'aron' },
  er: { yo: 'í', tu: 'iste', el: 'ió', nosotros: 'imos', vosotros: 'isteis', ellos: 'ieron' },
  ir: { yo: 'í', tu: 'iste', el: 'ió', nosotros: 'imos', vosotros: 'isteis', ellos: 'ieron' },
};
const PRESENTE_SUBJ: Record<Group, Endings> = {
  ar: { yo: 'e', tu: 'es', el: 'e', nosotros: 'emos', vosotros: 'éis', ellos: 'en' },
  er: { yo: 'a', tu: 'as', el: 'a', nosotros: 'amos', vosotros: 'áis', ellos: 'an' },
  ir: { yo: 'a', tu: 'as', el: 'a', nosotros: 'amos', vosotros: 'áis', ellos: 'an' },
};
const IMPERFECTO_SUBJ: Record<Group, Endings> = {
  // -ra form (the more common one; -se variant is a future addition).
  ar: { yo: 'ara', tu: 'aras', el: 'ara', nosotros: 'áramos', vosotros: 'arais', ellos: 'aran' },
  er: { yo: 'iera', tu: 'ieras', el: 'iera', nosotros: 'iéramos', vosotros: 'ierais', ellos: 'ieran' },
  ir: { yo: 'iera', tu: 'ieras', el: 'iera', nosotros: 'iéramos', vosotros: 'ierais', ellos: 'ieran' },
};
// Future / conditional endings are appended to the WHOLE infinitive (or futureStem).
const FUTURO: Endings = { yo: 'é', tu: 'ás', el: 'á', nosotros: 'emos', vosotros: 'éis', ellos: 'án' };
const CONDICIONAL: Endings = { yo: 'ía', tu: 'ías', el: 'ía', nosotros: 'íamos', vosotros: 'íais', ellos: 'ían' };
// Regular affirmative imperative endings (yo has no imperative).
const IMPERATIVO_AFIRM: Record<Group, Partial<Record<Person, string>>> = {
  ar: { tu: 'a', el: 'e', nosotros: 'emos', vosotros: 'ad', ellos: 'en' },
  er: { tu: 'e', el: 'a', nosotros: 'amos', vosotros: 'ed', ellos: 'an' },
  ir: { tu: 'e', el: 'a', nosotros: 'amos', vosotros: 'id', ellos: 'an' },
};

// ---- Public regular-ending reference (视图 A 规则页用) ----------------------

/** Simple synthetic tenses whose endings attach to the STEM (per group). */
export const REGULAR_ENDINGS: Record<
  'presente' | 'preteritoImperfecto' | 'preteritoIndefinido' | 'presenteSubj' | 'imperfectoSubj',
  Record<Group, Endings>
> = {
  presente: PRESENTE,
  preteritoImperfecto: IMPERFECTO,
  preteritoIndefinido: INDEFINIDO,
  presenteSubj: PRESENTE_SUBJ,
  imperfectoSubj: IMPERFECTO_SUBJ,
};

/** Future & conditional attach these endings to the whole INFINITIVE (all 3 groups alike). */
export const FUTURO_ENDINGS: Endings = FUTURO;
export const CONDICIONAL_ENDINGS: Endings = CONDICIONAL;

/** Affirmative imperative endings (no `yo`). */
export const IMPERATIVO_AFIRM_ENDINGS: Record<Group, Partial<Record<Person, string>>> = IMPERATIVO_AFIRM;

/** Non-finite suffixes. */
export const NONFINITE_SUFFIXES = {
  gerundio: { ar: 'ando', er: 'iendo', ir: 'iendo' },
  participio: { ar: 'ado', er: 'ido', ir: 'ido' },
} as const;

// ---- Auxiliaries (built in, used by compound tenses) -----------------------

const HABER: Record<string, Endings> = {
  presente: { yo: 'he', tu: 'has', el: 'ha', nosotros: 'hemos', vosotros: 'habéis', ellos: 'han' },
  imperfecto: { yo: 'había', tu: 'habías', el: 'había', nosotros: 'habíamos', vosotros: 'habíais', ellos: 'habían' },
  futuro: { yo: 'habré', tu: 'habrás', el: 'habrá', nosotros: 'habremos', vosotros: 'habréis', ellos: 'habrán' },
  condicional: { yo: 'habría', tu: 'habrías', el: 'habría', nosotros: 'habríamos', vosotros: 'habríais', ellos: 'habrían' },
  presenteSubj: { yo: 'haya', tu: 'hayas', el: 'haya', nosotros: 'hayamos', vosotros: 'hayáis', ellos: 'hayan' },
  imperfectoSubj: { yo: 'hubiera', tu: 'hubieras', el: 'hubiera', nosotros: 'hubiéramos', vosotros: 'hubierais', ellos: 'hubieran' },
};
const ESTAR_PRESENTE: Endings = {
  yo: 'estoy', tu: 'estás', el: 'está', nosotros: 'estamos', vosotros: 'estáis', ellos: 'están',
};

// ---- Builders --------------------------------------------------------------

function groupOf(infinitive: string): Group {
  const end = infinitive.slice(-2);
  if (end === 'ar' || end === 'er' || end === 'ir') return end;
  throw new Error(`Not a conjugatable infinitive: ${infinitive}`);
}

/** A synthetic tense: stem + ending per person, with optional overrides. */
function buildSimple(
  stem: string,
  endings: Endings,
  overrides?: Partial<Record<Person, string>>,
): Record<Person, Cell> {
  const out = {} as Record<Person, Cell>;
  for (const p of PERSONS) {
    const regularForm = stem + endings[p];
    const form = overrides?.[p] ?? regularForm;
    out[p] = { form, regular: form === regularForm };
  }
  return out;
}

/** Future / conditional: (futureStem | infinitive) + ending. */
function buildFuture(
  infinitive: string,
  futureStem: string | undefined,
  endings: Endings,
  overrides?: Partial<Record<Person, string>>,
): Record<Person, Cell> {
  const base = futureStem ?? infinitive;
  const out = {} as Record<Person, Cell>;
  for (const p of PERSONS) {
    const regularForm = infinitive + endings[p]; // the rule uses the full infinitive
    const form = overrides?.[p] ?? base + endings[p];
    out[p] = { form, regular: form === regularForm };
  }
  return out;
}

function buildAffirmative(
  group: Group,
  stem: string,
  presente: Record<Person, Cell>,
  presenteSubj: Record<Person, Cell>,
  overrides?: Partial<Record<Person, string>>,
): Partial<Record<Person, Cell>> {
  const out: Partial<Record<Person, Cell>> = {};
  for (const p of ['tu', 'el', 'nosotros', 'vosotros', 'ellos'] as const) {
    const regularForm = stem + IMPERATIVO_AFIRM[group][p];
    let form: string;
    if (overrides?.[p] != null) form = overrides[p] as string;
    else if (p === 'tu') form = presente.el.form; // tú = 3rd-person-singular present
    else if (p === 'vosotros') form = regularForm; // vosotros affirmative is always regular
    else form = presenteSubj[p].form; // usted / nosotros / ustedes = present subjunctive
    out[p] = { form, regular: form === regularForm };
  }
  return out;
}

function buildNegative(presenteSubj: Record<Person, Cell>): Partial<Record<Person, Cell>> {
  const out: Partial<Record<Person, Cell>> = {};
  for (const p of ['tu', 'el', 'nosotros', 'vosotros', 'ellos'] as const) {
    out[p] = { form: `no ${presenteSubj[p].form}`, regular: presenteSubj[p].regular };
  }
  return out;
}

/** Compound tense: auxiliary + a single non-finite form (participle/gerund). */
function buildCompound(aux: Endings, nonFinite: Cell): Record<Person, Cell> {
  const out = {} as Record<Person, Cell>;
  for (const p of PERSONS) {
    out[p] = { form: `${aux[p]} ${nonFinite.form}`, regular: nonFinite.regular };
  }
  return out;
}

// ---- Public API ------------------------------------------------------------

/** Conjugate `infinitive`, applying `spec` overrides for irregular cells. */
export function conjugate(infinitive: string, spec: IrregularSpec = {}): Conjugation {
  const group = groupOf(infinitive);
  const stem = infinitive.slice(0, -2);
  const f = spec.forms ?? {};

  const presente = buildSimple(stem, PRESENTE[group], f.presente);
  const preteritoImperfecto = buildSimple(stem, IMPERFECTO[group], f.preteritoImperfecto);
  const preteritoIndefinido = buildSimple(stem, INDEFINIDO[group], f.preteritoIndefinido);
  const futuro = buildFuture(infinitive, spec.futureStem, FUTURO, f.futuro);
  const condicional = buildFuture(infinitive, spec.futureStem, CONDICIONAL, f.condicional);
  const presenteSubj = buildSimple(stem, PRESENTE_SUBJ[group], f.presenteSubj);
  const imperfectoSubj = buildSimple(stem, IMPERFECTO_SUBJ[group], f.imperfectoSubj);

  const gerRegular = stem + (group === 'ar' ? 'ando' : 'iendo');
  const gerundio: Cell = spec.gerundio
    ? { form: spec.gerundio, regular: spec.gerundio === gerRegular }
    : { form: gerRegular, regular: true };

  const partRegular = stem + (group === 'ar' ? 'ado' : 'ido');
  const participio: Cell = spec.participio
    ? { form: spec.participio, regular: spec.participio === partRegular }
    : { form: partRegular, regular: true };

  return {
    infinitivo: infinitive,
    group,
    gerundio,
    participio,
    tenses: {
      presente,
      preteritoImperfecto,
      preteritoIndefinido,
      futuro,
      condicional,
      presenteSubj,
      imperfectoSubj,
      presentePerfecto: buildCompound(HABER.presente, participio),
      pluscuamperfecto: buildCompound(HABER.imperfecto, participio),
      futuroPerfecto: buildCompound(HABER.futuro, participio),
      condicionalPerfecto: buildCompound(HABER.condicional, participio),
      perfectoSubj: buildCompound(HABER.presenteSubj, participio),
      pluscuamperfectoSubj: buildCompound(HABER.imperfectoSubj, participio),
      presenteProgresivo: buildCompound(ESTAR_PRESENTE, gerundio),
      imperativoAfirmativo: buildAffirmative(group, stem, presente, presenteSubj, f.imperativoAfirmativo),
      imperativoNegativo: buildNegative(presenteSubj),
    },
  };
}
