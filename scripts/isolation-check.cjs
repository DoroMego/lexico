// Staging-only audit: never opens the private corpus or configuration.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const parser=require('@babel/parser');
const words=require('../src/data/wordbank.json');
const excluded=new Set(['node_modules','dist','.expo']);
function files(dir,skip=false){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{if(skip&&excluded.has(e.name))return [];const p=path.join(dir,e.name);return e.isDirectory()?files(p,skip):[p];});}
for(const name of ['.git','.env','.claude','.codex','.agents','.vscode','.vercel'])assert.ok(!fs.existsSync(name),`Excluded path: ${name}`);
const own=files('.',true);assert.ok(!own.some(p=>/\.env\./.test(p)&&!p.endsWith('.env.example')));
const exported=files('dist');
const patterns={supabaseProject:/https?:\/\/[a-z0-9]{12,}\.supabase\.co/gi,personalEmail:/[A-Z0-9._%+-]+@(?:gmail|hotmail|outlook|icloud|yahoo)\.[a-z]+/gi,uuid:/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,anthropicKey:/sk-ant-[A-Za-z0-9_-]{20,}/g,googleKey:/AIza[A-Za-z0-9_-]{30,}/g,serviceKey:/sb_secret_[A-Za-z0-9_-]{15,}/g,personalPath:/\/Users\/[A-Za-z][^\s"'<>]{2,}/g};
const findings=[];
for(const file of [...own,...exported]){if(!/\.(?:json|js|cjs|mjs|ts|tsx|md|html|css|txt)$/.test(file))continue;// RFC namespace UUIDs bundled by dependencies are public constants, not user identifiers.
const text=fs.readFileSync(file,'utf8').replace(/6ba7b81[0124]-9dad-11d1-80b4-00c04fd430c8/g,'RFC_NAMESPACE');for(const [kind,re]of Object.entries(patterns)){re.lastIndex=0;if(re.test(text))findings.push({file,kind});}}
assert.deepEqual(findings,[],'Potential identifiers/secrets (values intentionally omitted)');
const bundled=[];
function literal(n){if(!n)return undefined;if(n.type==='StringLiteral'||n.type==='NumericLiteral'||n.type==='BooleanLiteral')return n.value;if(n.type==='NullLiteral')return null;if(n.type==='ArrayExpression')return n.elements.map(literal);}
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='ObjectExpression'){const obj={};for(const p of n.properties){if(p.type==='ObjectProperty')obj[p.key.name||p.key.value]=literal(p.value);}if(['spanish','english','chinese','exampleEs','exampleZh'].every(k=>typeof obj[k]==='string'))bundled.push(obj);}for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
for(const f of exported.filter(f=>f.endsWith('.js')))walk(parser.parse(fs.readFileSync(f,'utf8'),{sourceType:'unambiguous'}));
assert.equal(bundled.length,90,'Export must contain exactly the approved dataset records');
for(const w of words)assert.deepEqual(bundled.find(b=>b.spanish===w.spanish),w,w.spanish);
console.log(`✓ Staging-only isolation scan: ${own.length} source files, ${exported.length} export files; no matched project URLs/personal identifiers/private-key patterns; exactly 90 approved bundled records`);
console.log('Scope: no private corpus was opened; this is controlled-dataset equality plus pattern scanning, not a byte comparison against private content.');
