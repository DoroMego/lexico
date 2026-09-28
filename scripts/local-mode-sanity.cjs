const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
for(const os of ['web','ios','android']){
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('src/lib/supabase.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env:{}},require(name){
  if(name==='@supabase/supabase-js')return {createClient(){throw Error('Local mode must not initialize a cloud client');}};
  if(name==='react-native')return {Platform:{OS:os}};
  if(name==='@react-native-async-storage/async-storage')return {};
  throw Error(name);
 }});
 assert.equal(module.exports.supabase,null);assert.equal(module.exports.cloudEnabled,false);
}
console.log('✓ No-environment configuration creates no Supabase client on web/iOS/Android');

// Browser speech must never choose a network-backed voice in the default demo.
for (const localService of [false,true]) {
 const module={exports:{}};const spoken=[];
 const voice={lang:'es-ES',localService};
 const code=ts.transpileModule(fs.readFileSync('src/lib/speech.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env:{}},window:{speechSynthesis:{getVoices:()=>[voice],speak:u=>spoken.push(u)}},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},require(name){
  if(name==='expo-speech')return {speak(){throw Error('Web must not fall back to a possibly remote default voice');}};
  if(name==='react-native')return {Platform:{OS:'web'}};
  if(name==='@react-native-async-storage/async-storage')return {};
  throw Error(name);
 }});
 module.exports.speakEs('cocina');assert.equal(spoken.length,localService?1:0);
 if(localService)assert.equal(spoken[0].voice,voice);
}
console.log('✓ Web pronunciation uses local Spanish voices only; remote voices have no fallback');
