// Domain types shared across the app.
// Kept dependency-free so they can be imported anywhere (db, ui, tests).

/** Part of speech. `pos` drives whether 变性/变数 (gender/number) UI is shown. */
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'article'
  | 'phrase';

/** Grammatical gender for nouns/adjectives. `null` when not applicable. */
export type Gender = 'm' | 'f' | null;

/** DELE / CEFR proficiency level used to classify vocabulary. */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** A dictionary entry. Source of truth lives in the `words` table. */
export interface Word {
  id: number;
  spanish: string;
  english: string;
  chinese: string;
  pos: PartOfSpeech;
  gender: Gender;
  /** DELE level (A1–C2), used to classify and recommend vocabulary. */
  level: CEFRLevel;
  exampleEs: string | null;
  exampleZh: string | null;
}

/**
 * How well the user knows a word, chosen explicitly when collecting it
 * (收藏时强制选熟悉度) and again after every review.
 * Maps to an initial SRS interval — see `srs.ts`.
 */
export enum Familiarity {
  Unknown = 0, // 完全不熟
  Vague = 1, // 有点印象
  Familiar = 2, // 比较熟
  Mastered = 3, // 已掌握
}

/** Per-word spaced-repetition state (积累本 + 艾宾浩斯调度). */
export interface CollectionItem {
  wordId: number;
  familiarity: Familiarity;
  /** ms epoch. */
  addedAt: number;
  dueAt: number;
  lastReviewedAt: number | null;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

/** The ways a word can be drilled (背单词模式). */
export type ReviewMode =
  | 'es-to-zh' // 纯西语 → 猜中文
  | 'es-to-en' // 纯西语 → 猜英文
  | 'en-to-es' // 纯英文 → 猜西语
  | 'zh-to-es' // 纯中文 → 猜西语
  | 'speak-es' // 读出西语（发音练习）
  | 'listen-write'; // 听西语 → 写西语
