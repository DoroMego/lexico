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
