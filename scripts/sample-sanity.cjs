const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
 file=path.resolve(file); if(cache.has(file))return cache.get(file);
 if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
 const module={exports:{}}; cache.set(file,module.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,console,require(name){
  let target=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(file),name);
  if(!path.extname(target))target+='.ts'; return load(target);
 }},{filename:file}); return module.exports;
}
const words=load('src/data/wordbank.json');
assert.equal(words.length,90);
const pilot=words.slice(0,10);
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
assert.equal(new Set(words.map(w=>norm(w.spanish))).size,90);
const counts=key=>pilot.reduce((a,w)=>(a[w[key]]=(a[w[key]]||0)+1,a),{});
assert.deepEqual(counts('level'),{A1:5,A2:3,B1:2});
assert.deepEqual(counts('pos'),{noun:3,verb:3,adjective:2,adverb:1,conjunction:1});
for(const w of words){
 for(const f of ['spanish','english','chinese','pos','level','exampleEs','exampleZh'])assert.ok(w[f]?.trim());
 assert.ok(!('frequency' in w));
 for(const f of w.family??[])assert.ok(words.some(x=>x.spanish===f));
}
assert.equal(words.find(w=>w.spanish==='cocinero').exampleEs,'El cocinero prepara la sopa antes de las siete.');
assert.equal(words.find(w=>w.spanish==='decisión').english,'decision; a choice made after thinking');
const topics=load('src/data/topics.ts').TOPICS;
const guide=load('src/data/guide.ts').GUIDE_CATEGORIES;
assert.equal(topics.length,4);assert.equal(guide[0].topics.length,6);
for(const name of [...topics.flatMap(t=>t.words),...guide.flatMap(c=>c.topics.flatMap(t=>t.exampleWords??[]))])assert.ok(words.some(w=>w.spanish===name),name);
const meta=load('src/lib/wordbank-meta.ts');
assert.equal(meta.getNounBase('cocineras'),'cocinero');
assert.equal(meta.getAdjectiveBase('pequeñas'),'pequeño');
assert.equal(meta.getAdjectiveBase('útiles'),'útil');
const {rankResults}=load('src/lib/search-rank.ts');
for(const [q,expected] of [['cocina','cocina'],['kitchen','cocina'],['厨房','cocina'],['decision','decisión'],['pequeñas','pequeño'],['cocineras','cocinero'],['útiles','útil']]) {
 const adj=meta.getAdjectiveBase(q),noun=meta.getNounBase(q);
 assert.equal(rankResults(words,q,adj?norm(adj):null,noun?norm(noun):null)[0].spanish,expected,q);
}
const conj=load('src/lib/conjugate-verb.ts');
assert.equal(conj.conjugateInfinitive('cocinar').tenses.presente.yo.form,'cocino');
assert.equal(conj.conjugateInfinitive('beber').tenses.presente.yo.form,'bebo');
assert.equal(conj.conjugateInfinitive('tener').tenses.presente.yo.form,'tengo');
assert.equal(load('src/lib/reverse-conjugation.ts').reverseConjugationLookup('tengo').infinitive,'tener');
// Real web search adapter, with a read-only IndexedDB test double.
const source=ts.transpileModule(fs.readFileSync('src/lib/db.web.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const request=result=>{const r={result};queueMicrotask(()=>r.onsuccess());return r;};
const moduleWeb={exports:{}};
vm.runInNewContext(source,{module:moduleWeb,exports:moduleWeb.exports,console,indexedDB:{open:()=>request({transaction:()=>({objectStore:()=>({count:()=>request(90),getAll:()=>request(words.map((w,i)=>({...w,id:i+1,example_es:w.exampleEs,example_zh:w.exampleZh})))})})})},require(n){if(n==='./supabase')return {supabase:null};if(n==='./auth-store')return {getUser:()=>null};return load(n.startsWith('@/')?'src/'+n.slice(2):'src/lib/'+n.slice(2)+'.ts');}});
(async()=>{
 for(const [q,expected] of [['cocina','cocina'],['kitchen','cocina'],['厨房','cocina'],['decision','decisión'],['pequeñas','pequeño'],['cocineras','cocinero'],['útiles','útil']])assert.equal((await moduleWeb.exports.searchWords(q))[0].spanish,expected);
 assert.equal((await moduleWeb.exports.searchWords('', 'B1')).length,19);
 for (const w of words) {
  for (const q of [w.spanish, norm(w.spanish), w.english, w.chinese]) {
    assert.ok((await moduleWeb.exports.searchWords(q)).some(r=>r.spanish===w.spanish),`${w.spanish}: ${q}`);
  }
}
assert.deepEqual(counts('level'),{A1:5,A2:3,B1:2});
for (const [q,expected] of [['cancion','canción'],['canciones','canción'],['jardines','jardín'],['trabajadoras','trabajador'],['viajeras','viajero'],['limpias','limpio'],['responsables','responsable'],['disponibles','disponible'],['travel','viajar'],['学习；学会','aprender']]) {
 assert.ok((await moduleWeb.exports.searchWords(q)).some(w=>w.spanish===expected),q);
}
for(const q of ['cocin','trabaj','viaj'])assert.ok((await moduleWeb.exports.searchWords(q)).length>=3,q);
for(const [q,v] of [['soy','ser'],['voy','ir'],['hago','hacer'],['puedo','poder'],['durmiendo','dormir'],['tengo','tener'],['hablamos','hablar'],['vivimos','vivir']])assert.equal(load('src/lib/reverse-conjugation.ts').reverseConjugationLookup(q).infinitive,v);
const nouns=load('src/lib/inflect-noun.ts');assert.equal(nouns.getNounPlural('canción'),'canciones');assert.equal(nouns.getNounPlural('jardín'),'jardines');assert.equal(nouns.getNounPlural('decisión'),'decisiones');
for(const w of words.filter(w=>w.pos==='verb')) {
 const c=conj.conjugateInfinitive(w.spanish);assert.ok(c);
 assert.equal(Object.keys(c.tenses).length,16);
 for(const [tense,cells] of Object.entries(c.tenses)){assert.equal(Object.keys(cells).length,tense.startsWith('imperativo')?5:6);assert.ok(Object.values(cells).every(c=>c.form));}
}
console.log('✓ 90 entries: all Spanish/normalized/English/Chinese searches, prefixes, inflections, eight reverse forms and 25 verb tables passed');
})().catch(e=>{console.error(e);process.exitCode=1;});

for(const [verb,tense,person,expected] of [
 ['ser','presente','yo','soy'],['ser','preteritoImperfecto','nosotros','éramos'],['ser','imperativoAfirmativo','tu','sé'],
 ['ir','presente','yo','voy'],['ir','preteritoImperfecto','nosotros','íbamos'],['ir','imperativoAfirmativo','tu','ve'],
 ['hacer','preteritoIndefinido','el','hizo'],['hacer','presenteSubj','nosotros','hagamos'],['hacer','imperativoAfirmativo','tu','haz'],
 ['poder','presente','yo','puedo'],['poder','preteritoIndefinido','nosotros','pudimos'],['poder','presenteSubj','nosotros','podamos'],
 ['dormir','preteritoIndefinido','el','durmió'],['dormir','presenteSubj','nosotros','durmamos'],['dormir','imperfectoSubj','nosotros','durmiéramos'],
 ['tener','presente','yo','tengo'],['tener','preteritoIndefinido','nosotros','tuvimos'],['tener','imperativoAfirmativo','tu','ten']
]) assert.equal(conj.conjugateInfinitive(verb).tenses[tense][person].form,expected,`${verb} ${tense} ${person}`);
console.log('✓ Eighteen independently checked irregular-form fixtures passed');

const nounForms=load('src/lib/inflect-noun.ts');
for(const [base,feminine] of [['cocinero','cocinera'],['trabajador','trabajadora'],['viajero','viajera']]) {
 assert.equal(nounForms.getNounFeminine(base),feminine);
 assert.equal(meta.getNounBase(feminine),base);
 assert.equal(meta.getNounBase(feminine+'s'),base);
}
for(const [base,invalid] of [['trabajo','trabaja'],['estudio','estudia'],['libro','libra'],['tiempo','tiempa'],['esfuerzo','esfuerza'],['jardín','jardina'],['estudiante','estudianta']]) {
 assert.equal(nounForms.getNounFeminine(base),null);
 assert.equal(meta.getNounBase(invalid),null);
 assert.equal(meta.getNounBase(invalid+'s'),null);
}
assert.equal(meta.getNounBase('estudiantes'),'estudiante');
console.log('✓ Feminine regression: three eligible pairs, six rejected false pairs, unchanged common-gender estudiante and plural lookup');
