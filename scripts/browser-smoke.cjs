// Requires externally installed Playwright; no browser tooling is a runtime dependency.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage();const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.protocol.startsWith('http')&&!['localhost','127.0.0.1'].includes(u.hostname)){external.push(u.origin);return route.abort();}return route.continue();});
 const origin=process.env.PILOT_ORIGIN||'http://localhost:18097';
 await page.goto(origin,{waitUntil:'networkidle'});
 await page.getByText('cocina',{exact:true}).waitFor();
 const search=page.getByPlaceholder('buscar · 搜索 · search');
 for(const [query,expected] of [['kitchen','cocina'],['厨房','cocina'],['decision','decisión'],['cocineras','cocinero'],['pequeñas','pequeño'],['útiles','útil'],['tengo','tener'],['canciones','canción'],['jardines','jardín'],['voy','ir'],['hago','hacer'],['durmiendo','dormir']]){
  await search.fill(query);await page.getByText(expected,{exact:true}).first().waitFor();
 }
 await search.fill('cocina');await page.getByText('cocina',{exact:true}).click();
 await page.getByText('收藏 · Collect',{exact:true}).click();
 await page.getByText('完全不熟',{exact:true}).click();
 await page.getByText('取消收藏',{exact:true}).waitFor();
 await page.reload({waitUntil:'networkidle'});await page.getByText('取消收藏',{exact:true}).waitFor();
 await page.goto(origin+'/review/session',{waitUntil:'networkidle'});
 await page.getByText('显示答案',{exact:true}).click();
 await page.getByText('比较熟',{exact:true}).click();
 await page.getByText(/复习完成/).waitFor();
 await page.reload({waitUntil:'networkidle'}); // Verify review writes survive reload before reading IndexedDB.
 const state=await page.evaluate(async()=>{
  const db=await new Promise((r,j)=>{const q=indexedDB.open('lexico-public-sample90-v1');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});
  const read=name=>new Promise((r,j)=>{const q=db.transaction(name).objectStore(name).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});
  return {words:await read('words'),collection:await read('collection'),reviews:await read('reviews'),databases:await indexedDB.databases()};
 });
 assert.equal(state.words.length,90);assert.equal(state.collection.length,1);assert.equal(state.reviews.length,1);assert.equal(state.collection[0].reps,1);assert.ok(state.collection[0].due_at>state.collection[0].last_reviewed_at);
 assert.deepEqual(state.databases.map(x=>x.name),['lexico-public-sample90-v1']);
 await page.goto(origin+'/profile',{waitUntil:'networkidle'});await page.getByText(/Local sample/).waitFor();assert.equal(await page.getByPlaceholder('密码').count(),0);
 await page.goto(origin,{waitUntil:'networkidle'});await search.fill('pilotmissingword');
 await page.getByText('English',{exact:true}).click();await page.getByText('已提交（English）✓',{exact:true}).waitFor();
 await page.goto(origin+'/admin',{waitUntil:'networkidle'});await page.getByText('pilotmissingword',{exact:true}).waitFor();
 await page.reload({waitUntil:'networkidle'});await page.getByText('pilotmissingword',{exact:true}).waitFor();
 for(const route of ['/topic/kitchen','/topic/ideas','/guide/pilot','/guide/pilot/verbs','/guide/pilot/forms','/guide/pilot/family','/new-words','/topic/learning','/topic/daily','/guide/pilot/stem-change','/guide/pilot/gender','/guide/pilot/connectors','/word/6','/word/51','/word/54','/word/56','/word/57','/word/58']){
  await page.goto(origin+route,{waitUntil:'networkidle'});assert.ok((await page.locator('body').innerText()).length>10);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('✓ Chrome: 90-record seed, twelve searches, collect/reload/review, local profile/reports, expanded supporting/detail routes; no page errors or external HTTP requests');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
