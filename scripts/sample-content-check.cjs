const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),crypto=require('node:crypto');
const words=JSON.parse(fs.readFileSync('src/data/wordbank.json','utf8'));
const heads=new Set(words.map(w=>w.spanish));
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const count=k=>words.reduce((a,w)=>(a[w[k]]=(a[w[k]]||0)+1,a),{});
assert.equal(new Set(words.map(w=>norm(w.spanish))).size,words.length);
for(const w of words){
 for(const f of ['spanish','english','chinese','pos','level','exampleEs','exampleZh'])assert.ok(typeof w[f]==='string'&&w[f].trim(),`${w.spanish}: ${f}`);
 assert.ok(['A1','A2','B1'].includes(w.level));assert.ok(['noun','verb','adjective','adverb','pronoun','preposition','conjunction','article','phrase'].includes(w.pos));
 assert.ok(w.pos==='noun'?['m','f'].includes(w.gender):w.gender===null);
 assert.ok(!('frequency' in w));
 for(const f of w.family??[]){assert.ok(heads.has(f));assert.ok(words.find(x=>x.spanish===f).family?.includes(w.spanish));}
}
for(const field of ['english','chinese','exampleEs','exampleZh'])assert.equal(new Set(words.map(w=>norm(w[field]))).size,words.length,`duplicate ${field}`);
function data(file){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:m.exports,module:m});return m.exports;}
const topics=data('src/data/topics.ts').TOPICS,guide=data('src/data/guide.ts').GUIDE_CATEGORIES;
for(const h of [...topics.flatMap(x=>x.words),...guide.flatMap(c=>c.topics.flatMap(t=>t.exampleWords??[]))])assert.ok(heads.has(h),h);
const provenance=JSON.parse(fs.readFileSync('docs/SAMPLE_PROVENANCE.json','utf8'));
for(const [head,hash] of Object.entries(provenance.pilotHashes)){
 const w=words.find(w=>w.spanish===head);const canonical=JSON.stringify(Object.fromEntries(Object.keys(w).sort().map(k=>[k,w[k]])));
 assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'),hash,`pilot changed: ${head}`);
}
console.log(JSON.stringify({records:words.length,CEFR:count('level'),POS:count('pos'),topics:topics.length,grammarCards:guide.flatMap(c=>c.topics).length,checks:'schema, uniqueness, gender, references, duplicate text, exact pilot hashes passed'}));
