// Web-compatible database using IndexedDB (local) + Supabase (cloud when logged in)

import wordbank from '@/data/wordbank.json';
import { CEFRLevel, CollectionItem, Familiarity, ReviewMode, Word } from './types';
import { getAdjectiveBase, getNounBase } from './wordbank-meta';
import { rankResults } from './search-rank';
import { DAY_MS, initCollectionItem, review as srsReview } from './srs';
import { supabase } from './supabase';
import { getUser } from './auth-store';

// Days until next review per familiarity level (mirrors srs.ts INITIAL_INTERVAL_DAYS)
const FAM_INTERVAL_DAYS: Record<number, number> = { 0: 0, 1: 1, 2: 3, 3: 7 };

function cloudDueAt(familiarity: number, reviewedAt: string | null, createdAt: string): number {
  const base = reviewedAt ? new Date(reviewedAt).getTime() : new Date(createdAt).getTime();
  return base + (FAM_INTERVAL_DAYS[familiarity] ?? 0) * DAY_MS;
}

function cloudToCollectionItem(
  wordId: number,
  row: { word_id: string; familiarity: number; created_at: string; reviewed_at: string | null },
): CollectionItem {
  return {
    wordId,
    familiarity: row.familiarity as Familiarity,
    addedAt: new Date(row.created_at).getTime(),
    dueAt: cloudDueAt(row.familiarity, row.reviewed_at, row.created_at),
    lastReviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : null,
    intervalDays: FAM_INTERVAL_DAYS[row.familiarity] ?? 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
  };
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const SEED_WORDS = wordbank as Array<{
  spanish: string;
  english: string;
  chinese: string;
  pos: string;
  gender: string | null;
  level: string;
  exampleEs: string;
  exampleZh: string;
}>;

const DB_NAME = 'lexico-public-sample90-v1';
const DB_VERSION = 2;
const STORE_WORDS = 'words';
const STORE_COLLECTION = 'collection';
const STORE_REVIEWS = 'reviews';
const STORE_CHECKINS = 'checkins';
const STORE_MISSING = 'missing_words';

let dbInstance: IDBDatabase | null = null;

// In-memory word lookup (built after seeding)
let wordByIdCache = new Map<number, Word>();
let wordBySpanishCache = new Map<string, Word>();

export interface CollectionStats {
  total: number;
  due: number;
  mastered: number;
}

async function getIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_WORDS)) {
        const wordStore = db.createObjectStore(STORE_WORDS, { keyPath: 'id', autoIncrement: true });
        wordStore.createIndex('spanish', 'spanish', { unique: true });
        wordStore.createIndex('level', 'level');
      }
      if (!db.objectStoreNames.contains(STORE_COLLECTION)) {
        db.createObjectStore(STORE_COLLECTION, { keyPath: 'word_id' });
      }
      if (!db.objectStoreNames.contains(STORE_REVIEWS)) {
        const reviewStore = db.createObjectStore(STORE_REVIEWS, { keyPath: 'id', autoIncrement: true });
        reviewStore.createIndex('word_id', 'word_id');
      }
      if (!db.objectStoreNames.contains(STORE_CHECKINS)) {
        db.createObjectStore(STORE_CHECKINS, { keyPath: 'day' });
      }
      if (!db.objectStoreNames.contains(STORE_MISSING)) {
        db.createObjectStore(STORE_MISSING, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function getDb(): Promise<void> {
  await initDb();
  await buildWordCache();
}

let initPromise: Promise<void> | null = null;
export function initDb(): Promise<void> {
  if (!initPromise) initPromise = initializeDb().catch(error => { initPromise = null; throw error; });
  return initPromise;
}
async function initializeDb(): Promise<void> {
  const db = await getIndexedDB();
  const wordStore = db.transaction(STORE_WORDS, 'readonly').objectStore(STORE_WORDS);

  return new Promise((resolve, reject) => {
    const countRequest = wordStore.count();
    countRequest.onerror = () => reject(countRequest.error);
    countRequest.onsuccess = async () => {
      if (countRequest.result === 0) {
        await seedDatabase();
      }
      resolve();
    };
  });
}

async function seedDatabase(): Promise<void> {
  const seen = new Set<string>();
  const unique = SEED_WORDS.filter(w => {
    const key = w.spanish.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const db = await getIndexedDB();
  const tx = db.transaction(STORE_WORDS, 'readwrite');
  const store = tx.objectStore(STORE_WORDS);

  for (const word of unique) {
    const request = store.add({
      spanish: word.spanish,
      english: word.english,
      chinese: word.chinese,
      pos: word.pos,
      gender: word.gender,
      level: word.level,
      example_es: word.exampleEs,
      example_zh: word.exampleZh,
    });
    request.onerror = () => {
      if (request.error?.name !== 'ConstraintError') {
        console.error('[db.web] Error adding word:', word.spanish, request.error);
      }
    };
  }

  return new Promise((resolve, reject) => {
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
  });
}

async function buildWordCache(): Promise<void> {
  if (wordBySpanishCache.size > 0) return;
  await initDb(); // ensure words are seeded before building cache
  const words = await listWords();
  for (const w of words) {
    wordByIdCache.set(w.id, w);
    wordBySpanishCache.set(w.spanish.toLowerCase(), w);
  }
}

// ---- Query functions (words — always local) ----

export async function listWords(): Promise<Word[]> {
  const db = await getIndexedDB();
  const store = db.transaction(STORE_WORDS, 'readonly').objectStore(STORE_WORDS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as any[]).map(toWord));
  });
}

export async function searchWords(query: string, level?: CEFRLevel): Promise<Word[]> {
  await initDb();
  const db = await getIndexedDB();
  const store = db.transaction(STORE_WORDS, 'readonly').objectStore(STORE_WORDS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      let results = (request.result as any[]).map(toWord);
      if (query.trim()) {
        const q = query.toLowerCase();
        const qNorm = normalize(q);
        const adjBase = getAdjectiveBase(q);
        const adjBaseNorm = adjBase ? normalize(adjBase) : null;
        const nounBase = getNounBase(q);
        const nounBaseNorm = nounBase ? normalize(nounBase) : null;
        results = results.filter(
          w =>
            normalize(w.spanish).includes(qNorm) ||
            (adjBaseNorm !== null && normalize(w.spanish) === adjBaseNorm) ||
            (nounBaseNorm !== null && normalize(w.spanish) === nounBaseNorm) ||
            w.english.toLowerCase().includes(q) ||
            w.chinese.includes(q),
        );
        if (level) results = results.filter(w => w.level === level);
        resolve(rankResults(results, query.trim(), adjBaseNorm, nounBaseNorm));
        return;
      }
      if (level) results = results.filter(w => w.level === level);
      resolve(results);
    };
  });
}

export async function getWordBySpanish(spanish: string): Promise<Word | null> {
  await buildWordCache();
  return wordBySpanishCache.get(spanish.toLowerCase()) ?? null;
}

export async function getWord(id: number): Promise<Word | null> {
  const db = await getIndexedDB();
  const store = db.transaction(STORE_WORDS, 'readonly').objectStore(STORE_WORDS);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ? toWord(request.result) : null);
  });
}

// ---- Collection functions (cloud when logged in, IndexedDB when not) ----

export async function isCollected(wordId: number): Promise<boolean> {
  const user = getUser();
  if (user && supabase) {
    await buildWordCache();
    const word = wordByIdCache.get(wordId);
    if (!word) return false;
    const { data } = await supabase
      .from('collection')
      .select('word_id')
      .eq('user_id', user.id)
      .eq('word_id', word.spanish)
      .maybeSingle();
    return !!data;
  }

  const db = await getIndexedDB();
  const store = db.transaction(STORE_COLLECTION, 'readonly').objectStore(STORE_COLLECTION);
  return new Promise((resolve, reject) => {
    const request = store.get(wordId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(!!request.result);
  });
}

export async function collectedWordIds(): Promise<Set<number>> {
  const user = getUser();
  if (user && supabase) {
    await buildWordCache();
    const { data } = await supabase
      .from('collection')
      .select('word_id')
      .eq('user_id', user.id);
    const ids = new Set<number>();
    for (const row of data ?? []) {
      const word = wordBySpanishCache.get(row.word_id.toLowerCase());
      if (word) ids.add(word.id);
    }
    return ids;
  }

  const db = await getIndexedDB();
  const store = db.transaction(STORE_COLLECTION, 'readonly').objectStore(STORE_COLLECTION);
  return new Promise((resolve, reject) => {
    const request = store.getAllKeys();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(new Set(request.result as number[]));
  });
}

export async function collectWord(wordId: number, familiarity: Familiarity, now: number): Promise<void> {
  const user = getUser();
  const item = initCollectionItem(wordId, familiarity, now);

  if (user && supabase) {
    await buildWordCache();
    const word = wordByIdCache.get(wordId);
    if (word) {
      const { error } = await supabase.from('collection').upsert(
        { user_id: user.id, word_id: word.spanish, familiarity: item.familiarity },
        { onConflict: 'user_id,word_id' },
      );
      if (!error) return;
      console.warn('[db] Supabase upsert failed, saving locally:', error.message);
    }
    // fall through to IndexedDB if word not in cache or Supabase failed
  }

  const db = await getIndexedDB();
  const store = db.transaction(STORE_COLLECTION, 'readwrite').objectStore(STORE_COLLECTION);
  return new Promise((resolve, reject) => {
    const request = store.put({
      word_id: item.wordId,
      familiarity: item.familiarity,
      added_at: item.addedAt,
      due_at: item.dueAt,
      last_reviewed_at: item.lastReviewedAt,
      interval_days: item.intervalDays,
      ease: item.ease,
      reps: item.reps,
      lapses: item.lapses,
    });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function uncollectWord(wordId: number): Promise<void> {
  const user = getUser();
  if (user && supabase) {
    await buildWordCache();
    const word = wordByIdCache.get(wordId);
    if (!word) return;
    await supabase.from('collection').delete().eq('user_id', user.id).eq('word_id', word.spanish);
    return;
  }

  const db = await getIndexedDB();
  const store = db.transaction(STORE_COLLECTION, 'readwrite').objectStore(STORE_COLLECTION);
  return new Promise((resolve, reject) => {
    const request = store.delete(wordId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function listCollection(): Promise<{ word: Word; item: CollectionItem }[]> {
  await buildWordCache(); // needed by both cloud and local paths
  const user = getUser();
  if (user && supabase) {
    const { data, error } = await supabase
      .from('collection')
      .select('word_id, familiarity, created_at, reviewed_at')
      .eq('user_id', user.id);
    if (error) throw error;

    const results: { word: Word; item: CollectionItem }[] = [];
    for (const row of data ?? []) {
      const word = wordBySpanishCache.get(row.word_id.toLowerCase());
      if (!word) continue;
      results.push({ word, item: cloudToCollectionItem(word.id, row) });
    }
    results.sort((a, b) => a.item.dueAt - b.item.dueAt);
    return results;
  }

  const db = await getIndexedDB();
  const store = db.transaction(STORE_COLLECTION, 'readonly').objectStore(STORE_COLLECTION);

  const collectionData = await new Promise<any[]>((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  const results: { word: Word; item: CollectionItem }[] = [];
  for (const collRow of collectionData) {
    const word = wordByIdCache.get(collRow.word_id);
    if (word) results.push({ word, item: toCollectionItem(collRow) });
  }
  results.sort((a, b) => a.item.dueAt - b.item.dueAt);
  return results;
}

export async function collectionStats(now: number): Promise<CollectionStats> {
  const user = getUser();
  if (user && supabase) {
    const { data } = await supabase
      .from('collection')
      .select('familiarity, created_at, reviewed_at')
      .eq('user_id', user.id);
    const items = data ?? [];
    return {
      total: items.length,
      due: items.filter(i => cloudDueAt(i.familiarity, i.reviewed_at, i.created_at) <= now).length,
      mastered: items.filter(i => i.familiarity >= Familiarity.Mastered).length,
    };
  }

  const db = await getIndexedDB();
  const store = db.transaction(STORE_COLLECTION, 'readonly').objectStore(STORE_COLLECTION);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const items = request.result as any[];
      resolve({
        total: items.length,
        due: items.filter(i => i.due_at <= now).length,
        mastered: items.filter(i => i.familiarity >= Familiarity.Mastered).length,
      });
    };
  });
}

export async function clearCollection(): Promise<void> {
  const user = getUser();
  if (user && supabase) {
    await supabase.from('collection').delete().eq('user_id', user.id);
    return;
  }

  const db = await getIndexedDB();
  const store = db.transaction(STORE_COLLECTION, 'readwrite').objectStore(STORE_COLLECTION);
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function dueCount(now: number): Promise<number> {
  const user = getUser();
  if (user && supabase) {
    const { data } = await supabase
      .from('collection')
      .select('familiarity, created_at, reviewed_at')
      .eq('user_id', user.id);
    return (data ?? []).filter(i => cloudDueAt(i.familiarity, i.reviewed_at, i.created_at) <= now).length;
  }

  const db = await getIndexedDB();
  const store = db.transaction(STORE_COLLECTION, 'readonly').objectStore(STORE_COLLECTION);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve((request.result as any[]).filter(i => i.due_at <= now).length);
    };
  });
}

export async function dueCards(now: number): Promise<{ word: Word; item: CollectionItem }[]> {
  const cards = await listCollection();
  return cards.filter(c => c.item.dueAt <= now);
}

export async function recordReview(
  item: CollectionItem,
  mode: ReviewMode,
  grade: Familiarity,
  now: number,
  _localDay: string,
): Promise<void> {
  const wordId = item.wordId;
  const user = getUser();

  if (user && supabase) {
    await buildWordCache();
    const word = wordByIdCache.get(wordId);
    if (!word) return;
    const { error } = await supabase
      .from('collection')
      .update({ familiarity: grade, reviewed_at: new Date(now).toISOString() })
      .eq('user_id', user.id)
      .eq('word_id', word.spanish);
    if (error) throw error;
    return;
  }

  const db = await getIndexedDB();
  const tx = db.transaction([STORE_COLLECTION, STORE_REVIEWS, STORE_CHECKINS], 'readwrite');

  const collStore = tx.objectStore(STORE_COLLECTION);
  const collRow = await new Promise<any>((resolve, reject) => {
    const req = collStore.get(wordId);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
  if (!collRow) return;

  const newItem = srsReview(toCollectionItem(collRow), grade, now);
  collStore.put({
    word_id: newItem.wordId,
    familiarity: newItem.familiarity,
    added_at: newItem.addedAt,
    due_at: newItem.dueAt,
    last_reviewed_at: newItem.lastReviewedAt,
    interval_days: newItem.intervalDays,
    ease: newItem.ease,
    reps: newItem.reps,
    lapses: newItem.lapses,
  });

  tx.objectStore(STORE_REVIEWS).add({ word_id: wordId, mode, grade, reviewed_at: now });
  // Resolve only after both the SRS state and review log have committed.
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Review transaction aborted'));
  });
}

export async function checkinCount(localDay: string): Promise<number> {
  const db = await getIndexedDB();
  const store = db.transaction(STORE_CHECKINS, 'readonly').objectStore(STORE_CHECKINS);
  return new Promise((resolve, reject) => {
    const request = store.get(localDay);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.count ?? 0);
  });
}

/** Migrate local IndexedDB collection to Supabase (called once after sign-in). */
export async function migrateLocalToCloud(): Promise<void> {
  const user = getUser();
  if (!user || !supabase) return;
  await buildWordCache();

  const { data: existing } = await supabase
    .from('collection')
    .select('word_id')
    .eq('user_id', user.id)
    .limit(1);
  if (existing && existing.length > 0) return;

  const db = await getIndexedDB();
  const collectionStore = db.transaction(STORE_COLLECTION, 'readonly').objectStore(STORE_COLLECTION);

  const localItems = await new Promise<any[]>((resolve, reject) => {
    const req = collectionStore.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });

  if (localItems.length === 0) return;

  const rows = localItems
    .map(row => {
      const word = wordByIdCache.get(row.word_id);
      if (!word) return null;
      return {
        user_id: user.id,
        word_id: word.spanish,
        familiarity: row.familiarity,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length > 0) {
    await supabase.from('collection').upsert(rows, { onConflict: 'user_id,word_id' });
  }
}

// ---- Helpers ----

export type MissingLang = 'es' | 'zh' | 'en';

export async function reportMissingWord(word: string, lang: MissingLang): Promise<void> {
  // Write to local IndexedDB (works offline)
  const db = await getIndexedDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_MISSING, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_MISSING).add({ word: word.trim(), lang, at: Date.now() });
  });
  // Best-effort sync to Supabase (no auth required — anon policy)
  supabase?.from('missing_words').insert({ word: word.trim(), lang }).then(() => {});
}

export interface MissingWord { word: string; lang: MissingLang; count: number; lastAt: number }

export async function listMissingWords(): Promise<MissingWord[]> {
  if (!supabase) {
    const db = await getIndexedDB();
    const rows = await new Promise<any[]>((resolve, reject) => {
      const req = db.transaction(STORE_MISSING, 'readonly').objectStore(STORE_MISSING).getAll();
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    const groups = new Map<string, MissingWord>();
    for (const row of rows) {
      const key = `${row.lang}:${row.word.toLowerCase()}`;
      const old = groups.get(key);
      groups.set(key, {word: row.word, lang: row.lang, count: (old?.count ?? 0) + 1, lastAt: Math.max(old?.lastAt ?? 0, row.at)});
    }
    return [...groups.values()].sort((a,b) => b.count-a.count || b.lastAt-a.lastAt);
  }
  // Ensure session is loaded before making authenticated request
  await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('missing_words')
    .select('word, lang, submitted_at')
    .order('submitted_at', { ascending: false });
  if (error || !data) return [];
  const map = new Map<string, MissingWord>();
  for (const r of data) {
    const key = `${r.lang}:${r.word.toLowerCase()}`;
    const existing = map.get(key);
    const ts = new Date(r.submitted_at).getTime();
    if (existing) {
      existing.count++;
      if (ts > existing.lastAt) existing.lastAt = ts;
    } else {
      map.set(key, { word: r.word, lang: r.lang as MissingLang, count: 1, lastAt: ts });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}

export async function clearMissingWords(): Promise<void> {
  if (supabase) { await supabase.from('missing_words').delete().gte('id', 0); return; }
  const db = await getIndexedDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_MISSING, 'readwrite');
    tx.objectStore(STORE_MISSING).clear();
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

function normalizeGender(g: string | null | undefined): Word['gender'] {
  if (g === 'm' || g === 'masculine') return 'm';
  if (g === 'f' || g === 'feminine') return 'f';
  return null;
}

function toWord(row: any): Word {
  return {
    id: row.id,
    spanish: row.spanish,
    english: row.english,
    chinese: row.chinese,
    pos: row.pos as Word['pos'],
    gender: normalizeGender(row.gender),
    level: row.level as Word['level'],
    exampleEs: row.example_es,
    exampleZh: row.example_zh,
  };
}

function toCollectionItem(row: any): CollectionItem {
  return {
    wordId: row.word_id,
    familiarity: row.familiarity as Familiarity,
    addedAt: row.added_at,
    dueAt: row.due_at,
    lastReviewedAt: row.last_reviewed_at,
    intervalDays: row.interval_days,
    ease: row.ease,
    reps: row.reps,
    lapses: row.lapses,
  };
}
