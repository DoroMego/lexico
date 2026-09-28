// Quick correctness check for the conjugation engine.
// Run: node --experimental-strip-types scripts/conjugation-sanity.ts
import { conjugate, type IrregularSpec } from '../src/lib/conjugation.ts';
import { IRREGULARS } from '../src/data/irregular-verbs.ts';

let failures = 0;
function eq(label: string, actual: string, expected: string) {
  if (actual !== expected) {
    failures++;
    console.error(`✗ ${label}: got "${actual}", expected "${expected}"`);
  }
}
function flag(label: string, actual: boolean, expected: boolean) {
  if (actual !== expected) {
    failures++;
    console.error(`✗ ${label}: regular=${actual}, expected ${expected}`);
  }
}

// --- Regular -ar / -er / -ir ---
const hablar = conjugate('hablar');
eq('hablar pres yo', hablar.tenses.presente.yo!.form, 'hablo');
eq('hablar pres ellos', hablar.tenses.presente.ellos!.form, 'hablan');
eq('hablar indef el', hablar.tenses.preteritoIndefinido.el!.form, 'habló');
eq('hablar imperf nos', hablar.tenses.preteritoImperfecto.nosotros!.form, 'hablábamos');
eq('hablar futuro yo', hablar.tenses.futuro.yo!.form, 'hablaré');
eq('hablar cond el', hablar.tenses.condicional.el!.form, 'hablaría');
eq('hablar subj pres yo', hablar.tenses.presenteSubj.yo!.form, 'hable');
eq('hablar subjImp el', hablar.tenses.imperfectoSubj.el!.form, 'hablara');
eq('hablar imper tu', hablar.tenses.imperativoAfirmativo.tu!.form, 'habla');
eq('hablar imper neg tu', hablar.tenses.imperativoNegativo.tu!.form, 'no hables');
eq('hablar gerundio', hablar.gerundio.form, 'hablando');
eq('hablar participio', hablar.participio.form, 'hablado');
eq('hablar perf yo', hablar.tenses.presentePerfecto.yo!.form, 'he hablado');
eq('hablar progres yo', hablar.tenses.presenteProgresivo.yo!.form, 'estoy hablando');
flag('hablar pres yo regular', hablar.tenses.presente.yo!.regular, true);

const comer = conjugate('comer');
eq('comer pres nos', comer.tenses.presente.nosotros!.form, 'comemos');
eq('comer indef ellos', comer.tenses.preteritoIndefinido.ellos!.form, 'comieron');
eq('comer gerundio', comer.gerundio.form, 'comiendo');

const vivir = conjugate('vivir');
eq('vivir pres nos', vivir.tenses.presente.nosotros!.form, 'vivimos');
eq('vivir pres vos', vivir.tenses.presente.vosotros!.form, 'vivís');

// --- Irregular: tener ---
const tenerSpec: IrregularSpec = {
  futureStem: 'tendr',
  forms: {
    presente: { yo: 'tengo', tu: 'tienes', el: 'tiene', ellos: 'tienen' },
    preteritoIndefinido: { yo: 'tuve', tu: 'tuviste', el: 'tuvo', nosotros: 'tuvimos', vosotros: 'tuvisteis', ellos: 'tuvieron' },
    presenteSubj: { yo: 'tenga', tu: 'tengas', el: 'tenga', nosotros: 'tengamos', vosotros: 'tengáis', ellos: 'tengan' },
    imperfectoSubj: { yo: 'tuviera', tu: 'tuvieras', el: 'tuviera', nosotros: 'tuviéramos', vosotros: 'tuvierais', ellos: 'tuvieran' },
    imperativoAfirmativo: { tu: 'ten' },
  },
};
const tener = conjugate('tener', tenerSpec);
eq('tener pres yo', tener.tenses.presente.yo!.form, 'tengo');
eq('tener pres nos', tener.tenses.presente.nosotros!.form, 'tenemos');
flag('tener pres yo irregular', tener.tenses.presente.yo!.regular, false);
flag('tener pres nos regular', tener.tenses.presente.nosotros!.regular, true);
eq('tener futuro yo', tener.tenses.futuro.yo!.form, 'tendré');
flag('tener futuro yo irregular', tener.tenses.futuro.yo!.regular, false);
eq('tener indef el', tener.tenses.preteritoIndefinido.el!.form, 'tuvo');
eq('tener imper tu', tener.tenses.imperativoAfirmativo.tu!.form, 'ten');
eq('tener imper usted', tener.tenses.imperativoAfirmativo.el!.form, 'tenga');
eq('tener imper neg tu', tener.tenses.imperativoNegativo.tu!.form, 'no tengas');

// --- Irregular only in yo + irregular participle: hacer ---
const hacerSpec: IrregularSpec = {
  futureStem: 'har',
  participio: 'hecho',
  forms: {
    presente: { yo: 'hago' },
    preteritoIndefinido: { yo: 'hice', tu: 'hiciste', el: 'hizo', nosotros: 'hicimos', vosotros: 'hicisteis', ellos: 'hicieron' },
    presenteSubj: { yo: 'haga', tu: 'hagas', el: 'haga', nosotros: 'hagamos', vosotros: 'hagáis', ellos: 'hagan' },
    imperativoAfirmativo: { tu: 'haz' },
  },
};
const hacer = conjugate('hacer', hacerSpec);
eq('hacer pres yo', hacer.tenses.presente.yo!.form, 'hago');
eq('hacer pres tu', hacer.tenses.presente.tu!.form, 'haces');
flag('hacer pres yo irregular', hacer.tenses.presente.yo!.regular, false);
flag('hacer pres tu regular', hacer.tenses.presente.tu!.regular, true);
eq('hacer participio', hacer.participio.form, 'hecho');
eq('hacer perf yo', hacer.tenses.presentePerfecto.yo!.form, 'he hecho');
flag('hacer perf yo irregular (part)', hacer.tenses.presentePerfecto.yo!.regular, false);

// Pilot data-map coverage replaces the private corpus map assertions.
const pilotTener = conjugate('tener', IRREGULARS.tener);
eq('pilot tener yo', pilotTener.tenses.presente.yo!.form, 'tengo');
eq('pilot tener futuro', pilotTener.tenses.futuro.yo!.form, 'tendré');
eq('pilot tener imperfect subjunctive', pilotTener.tenses.imperfectoSubj.nosotros!.form, 'tuviéramos');

if (failures === 0) console.log('✓ all conjugation sanity checks passed');
else {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
