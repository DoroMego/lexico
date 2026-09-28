// Adapter regression checks with deterministic IndexedDB/Supabase test doubles.
// Run: node scripts/review-web-sanity.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: name => {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
    ...globals,
  }, { filename: file });
  return module.exports;
}
const types = load('src/lib/types.ts', {});
const srs = load('src/lib/srs.ts', { './types': types });

async function check({ cloud = false, fail = false } = {}) {
  const now = 1_800_000_000_000;
  const item = srs.initCollectionItem(7, types.Familiarity.Unknown, now);
  const row = {
    word_id: 7, familiarity: 0, added_at: now, due_at: now,
    last_reviewed_at: null, interval_days: 0, ease: 2.5, reps: 0, lapses: 0,
  };
  const writes = [];
  let committed = false;
  const request = result => {
    const req = { result };
    queueMicrotask(() => req.onsuccess?.());
    return req;
  };
  const db = {
    transaction(names) {
      const tx = {
        error: fail ? new Error('simulated persistence failure') : null,
        objectStore(name) {
          return {
            count: () => request(1),
            getAll: () => request([{ id: 7, spanish: 'hablar', english: 'speak', chinese: '说', pos: 'verb', level: 'A1' }]),
            get: key => {
              assert.equal(key, 7, 'IndexedDB receives a numeric word ID');
              return request(row);
            },
            put: value => writes.push({ name, value }),
            add: value => {
              writes.push({ name, value });
              setImmediate(() => {
                if (fail) tx.onabort?.();
                else { committed = true; tx.oncomplete?.(); }
              });
            },
          };
        },
      };
      return tx;
    },
  };
  const filters = [];
  const query = {
    update(value) { writes.push({ value }); return this; },
    eq(key, value) { filters.push([key, value]); return this; },
    then(resolve, reject) { return Promise.resolve({ error: fail ? new Error('cloud failure') : null }).then(resolve, reject); },
  };
  const adapter = load('src/lib/db.web.ts', {
    '@/data/wordbank.json': [], './types': types,
    './wordbank-meta': {}, './search-rank': {}, './srs': srs,
    './supabase': { supabase: { from: () => query } },
    './auth-store': { getUser: () => cloud ? { id: 'test-user' } : null },
  }, { indexedDB: { open: () => request(db) }, console });
  const result = adapter.recordReview(item, 'es-to-zh', types.Familiarity.Familiar, now, '2027-01-15');
  if (fail) {
    await assert.rejects(result, /failure/);
    return;
  }
  await result;
  if (cloud) {
    assert.equal(filters.find(([key]) => key === 'word_id')[1], 'hablar');
    assert.equal(filters.find(([key]) => key === 'user_id')[1], 'test-user');
    assert.equal(writes[0].value.familiarity, types.Familiarity.Familiar);
  } else {
    assert.ok(committed, 'review resolves after the transaction commits');
    assert.equal(writes[0].value.word_id, 7);
    assert.equal(writes[0].value.due_at, now + srs.DAY_MS);
    assert.equal(writes[0].value.reps, 1);
    assert.equal(writes[1].value.word_id, 7);
    assert.equal(writes[1].value.mode, 'es-to-zh');
  }
}
(async () => {
  await check();
  await check({ fail: true });
  await check({ cloud: true });
  await check({ cloud: true, fail: true });
  console.log('✓ web review adapter: local/cloud persistence and failure checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
