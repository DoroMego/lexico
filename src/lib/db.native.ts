// SQLite access layer (native platform).
// UI code should call the repository functions here, never run SQL directly.

import * as SQLite from 'expo-sqlite';

import { SEED_WORDS } from '@/data/seed-words';
import { CEFRLevel, CollectionItem, Familiarity, ReviewMode, Word } from './types';
import { getAdjectiveBase, getNounBase } from './wordbank-meta';
import { rankResults } from './search-rank';
import { initCollectionItem, review as srsReview } from './srs';

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Bump this when the schema changes during early dev (no migrations yet) so the
// DB re-creates + re-seeds cleanly. TODO: real migrations before any real users.
const DB_NAME = 'lexico-public-sample90-v1.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Lazily open + initialize the database (idempotent). */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      await seedIfEmpty(db);
      return db;
    })();
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS words (
      id         INTEGER PRIMARY KEY NOT NULL,
      spanish    TEXT NOT NULL,
      english    TEXT NOT NULL,
      chinese    TEXT NOT NULL,
      pos        TEXT NOT NULL,
      gender     TEXT,
      level      TEXT NOT NULL DEFAULT 'A1',
      example_es TEXT,
      example_zh TEXT,
      conjugations TEXT
    );

    -- 积累本 + SRS state, one row per collected word.
    CREATE TABLE IF NOT EXISTS collection (
      word_id          INTEGER PRIMARY KEY NOT NULL REFERENCES words(id),
      familiarity      INTEGER NOT NULL,
      added_at         INTEGER NOT NULL,
      due_at           INTEGER NOT NULL,
      last_reviewed_at INTEGER,
      interval_days    REAL NOT NULL,
      ease             REAL NOT NULL,
      reps             INTEGER NOT NULL,
      lapses           INTEGER NOT NULL
    );

    -- Append-only review log; feeds the level-inference + analytics later.
    CREATE TABLE IF NOT EXISTS reviews (
      id          INTEGER PRIMARY KEY NOT NULL,
      word_id     INTEGER NOT NULL REFERENCES words(id),
      mode        TEXT NOT NULL,
      grade       INTEGER NOT NULL,
      reviewed_at INTEGER NOT NULL
    );

    -- 打卡: one row per calendar day the user studied.
    CREATE TABLE IF NOT EXISTS checkins (
      day   TEXT PRIMARY KEY NOT NULL,  -- YYYY-MM-DD (local)
      count INTEGER NOT NULL DEFAULT 0
    );

    -- User-reported missing words for admin review.
    CREATE TABLE IF NOT EXISTS missing_words (
      id   INTEGER PRIMARY KEY NOT NULL,
      word TEXT NOT NULL,
      lang TEXT NOT NULL DEFAULT 'es',
      at   INTEGER NOT NULL
    );
  `);
}

async function seedIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM words');
  if (row && row.n > 0) return;

  await db.withTransactionAsync(async () => {
    for (const w of SEED_WORDS) {
      await db.runAsync(
        `INSERT INTO words (spanish, english, chinese, pos, gender, level, example_es, example_zh)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [w.spanish, w.english, w.chinese, w.pos, w.gender, w.level, w.exampleEs, w.exampleZh],
      );
    }
  });
}

// ---- Mapping helpers -------------------------------------------------------

interface WordRow {
  id: number;
  spanish: string;
  english: string;
  chinese: string;
  pos: string;
  gender: string | null;
  level: string;
  example_es: string | null;
  example_zh: string | null;
}

function toWord(r: WordRow): Word {
  return {
    id: r.id,
    spanish: r.spanish,
    english: r.english,
    chinese: r.chinese,
    pos: r.pos as Word['pos'],
    gender: r.gender as Word['gender'],
    level: r.level as Word['level'],
    exampleEs: r.example_es,
    exampleZh: r.example_zh,
  };
}

interface CollectionRow {
  word_id: number;
  familiarity: number;
  added_at: number;
  due_at: number;
  last_reviewed_at: number | null;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
}

function toCollectionItem(r: CollectionRow): CollectionItem {
  return {
    wordId: r.word_id,
    familiarity: r.familiarity as Familiarity,
    addedAt: r.added_at,
    dueAt: r.due_at,
    lastReviewedAt: r.last_reviewed_at,
    intervalDays: r.interval_days,
    ease: r.ease,
    reps: r.reps,
    lapses: r.lapses,
  };
}

async function upsertCollection(db: SQLite.SQLiteDatabase, item: CollectionItem): Promise<void> {
  await db.runAsync(
    `INSERT INTO collection
       (word_id, familiarity, added_at, due_at, last_reviewed_at, interval_days, ease, reps, lapses)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(word_id) DO UPDATE SET
       familiarity = excluded.familiarity,
       due_at = excluded.due_at,
       last_reviewed_at = excluded.last_reviewed_at,
       interval_days = excluded.interval_days,
       ease = excluded.ease,
       reps = excluded.reps,
       lapses = excluded.lapses`,
    [
      item.wordId,
      item.familiarity,
      item.addedAt,
      item.dueAt,
      item.lastReviewedAt,
      item.intervalDays,
      item.ease,
      item.reps,
      item.lapses,
    ],
  );
}

// ---- Repository ------------------------------------------------------------

export async function listWords(): Promise<Word[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WordRow>('SELECT * FROM words ORDER BY level, spanish');
  return rows.map(toWord);
}

/** Search the dictionary by substring (中/英/西) and/or DELE level. */
export async function searchWords(query: string, level?: CEFRLevel): Promise<Word[]> {
  const db = await getDb();
  const q = query.trim();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (level) {
    where.push('level = ?');
    params.push(level);
  }
  const sql = `SELECT * FROM words ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY level, spanish`;
  const rows = await db.getAllAsync<WordRow>(sql, params);
  let results = rows.map(toWord);
  if (q) {
    const qLower = q.toLowerCase();
    const qNorm = normalize(q);
    const adjBase = getAdjectiveBase(q);
    const adjBaseNorm = adjBase ? normalize(adjBase) : null;
    const nounBase = getNounBase(q);
    const nounBaseNorm = nounBase ? normalize(nounBase) : null;
    results = results.filter(w =>
      normalize(w.spanish).includes(qNorm) ||
      (adjBaseNorm !== null && normalize(w.spanish) === adjBaseNorm) ||
      (nounBaseNorm !== null && normalize(w.spanish) === nounBaseNorm) ||
      w.english.toLowerCase().includes(qLower) ||
      w.chinese.includes(qLower),
    );
    return rankResults(results, q, adjBaseNorm, nounBaseNorm);
  }
  return results;
}

export async function getWord(id: number): Promise<Word | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WordRow>('SELECT * FROM words WHERE id = ?', [id]);
  return row ? toWord(row) : null;
}

export async function getWordBySpanish(spanish: string): Promise<Word | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WordRow>('SELECT * FROM words WHERE spanish = ? COLLATE NOCASE', [spanish]);
  return row ? toWord(row) : null;
}

/** Is this word currently in the 积累本? */
export async function isCollected(wordId: number): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM collection WHERE word_id = ?',
    [wordId],
  );
  return !!row && row.n > 0;
}

/** word ids currently in the 积累本. */
export async function collectedWordIds(): Promise<Set<number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ word_id: number }>('SELECT word_id FROM collection');
  return new Set(rows.map((r) => r.word_id));
}

/** 收藏一个单词，强制带上初始熟悉度。 */
export async function collectWord(
  wordId: number,
  familiarity: Familiarity,
  now: number,
): Promise<void> {
  const db = await getDb();
  await upsertCollection(db, initCollectionItem(wordId, familiarity, now));
}

export async function uncollectWord(wordId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM collection WHERE word_id = ?', [wordId]);
}

/** All collected words + their SRS state, soonest-due first (积累本). */
export async function listCollection(): Promise<{ word: Word; item: CollectionItem }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WordRow & CollectionRow>(
    `SELECT w.*, c.* FROM collection c JOIN words w ON w.id = c.word_id
     ORDER BY c.due_at ASC`,
  );
  return rows.map((r) => ({ word: toWord(r), item: toCollectionItem(r) }));
}

export interface CollectionStats {
  total: number;
  due: number;
  mastered: number;
}

/** Headline numbers for the 我的 page. */
export async function collectionStats(now: number): Promise<CollectionStats> {
  const db = await getDb();
  const row = await db.getFirstAsync<CollectionStats>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN due_at <= ? THEN 1 ELSE 0 END) AS due,
       SUM(CASE WHEN familiarity >= ? THEN 1 ELSE 0 END) AS mastered
     FROM collection`,
    [now, Familiarity.Mastered],
  );
  return { total: row?.total ?? 0, due: row?.due ?? 0, mastered: row?.mastered ?? 0 };
}

/** Empty the 积累本 (does not touch the dictionary or review log). */
export async function clearCollection(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM collection');
}

/** Number of reviews logged for a given local day (打卡 progress). */
export async function checkinCount(localDay: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT count FROM checkins WHERE day = ?',
    [localDay],
  );
  return row?.count ?? 0;
}

/** How many cards are due for review right now. */
export async function dueCount(now: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM collection WHERE due_at <= ?',
    [now],
  );
  return row?.n ?? 0;
}

/** Cards due for review now, oldest-due first. */
export async function dueCards(now: number): Promise<{ word: Word; item: CollectionItem }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WordRow & CollectionRow>(
    `SELECT w.*, c.* FROM collection c JOIN words w ON w.id = c.word_id
     WHERE c.due_at <= ? ORDER BY c.due_at ASC`,
    [now],
  );
  return rows.map((r) => ({ word: toWord(r), item: toCollectionItem(r) }));
}

/** Record a review: log it, advance SRS state, and bump today's 打卡. */
export async function recordReview(
  item: CollectionItem,
  mode: ReviewMode,
  grade: Familiarity,
  now: number,
  localDay: string,
): Promise<CollectionItem> {
  const db = await getDb();
  const next = srsReview(item, grade, now);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO reviews (word_id, mode, grade, reviewed_at) VALUES (?, ?, ?, ?)',
      [item.wordId, mode, grade, now],
    );
    await upsertCollection(db, next);
    await db.runAsync(
      `INSERT INTO checkins (day, count) VALUES (?, 1)
       ON CONFLICT(day) DO UPDATE SET count = count + 1`,
      [localDay],
    );
  });
  return next;
}

export async function migrateLocalToCloud(): Promise<void> {
  // Native uses SQLite directly; cloud migration not implemented on native yet.
}

export type MissingLang = 'es' | 'zh' | 'en';
export interface MissingWord { word: string; lang: MissingLang; count: number; lastAt: number }

export async function reportMissingWord(word: string, lang: MissingLang): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO missing_words (word, lang, at) VALUES (?, ?, ?)',
    [word.trim(), lang, Date.now()],
  );
}

export async function listMissingWords(): Promise<MissingWord[]> {
  const db = await getDb();
  return db.getAllAsync<MissingWord>(
    `SELECT word, lang, COUNT(*) AS count, MAX(at) AS lastAt
     FROM missing_words GROUP BY lang, LOWER(word) ORDER BY count DESC, lastAt DESC`,
  );
}

export async function clearMissingWords(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM missing_words');
}
