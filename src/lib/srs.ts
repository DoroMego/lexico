// Spaced-repetition scheduling (艾宾浩斯遗忘曲线).
//
// A small SM-2 variant. Pure functions only — no I/O, no Date.now() inside —
// so the scheduler is deterministic and unit-testable. Callers pass `now`.

import { CollectionItem, Familiarity } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** How the user rates recall after a review (or when first collecting). */
export type Grade = Familiarity;

/** Initial interval (days) seeded from the familiarity chosen on collect. */
const INITIAL_INTERVAL_DAYS: Record<Familiarity, number> = {
  [Familiarity.Unknown]: 0, // due immediately
  [Familiarity.Vague]: 1,
  [Familiarity.Familiar]: 3,
  [Familiarity.Mastered]: 7,
};

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/** Build the SRS state for a word the moment it is added to the 积累本. */
export function initCollectionItem(
  wordId: number,
  familiarity: Familiarity,
  now: number,
): CollectionItem {
  const intervalDays = INITIAL_INTERVAL_DAYS[familiarity];
  return {
    wordId,
    familiarity,
    addedAt: now,
    dueAt: now + intervalDays * DAY_MS,
    lastReviewedAt: null,
    intervalDays,
    ease: DEFAULT_EASE,
    reps: 0,
    lapses: 0,
  };
}

/**
 * Advance SRS state after a review.
 * Grade < Familiar is treated as a lapse: interval resets and the card
 * comes back the same day.
 */
export function review(item: CollectionItem, grade: Grade, now: number): CollectionItem {
  const passed = grade >= Familiarity.Familiar;

  // Adjust ease the SM-2 way, clamped.
  const q = grade; // 0..3
  const ease = Math.max(MIN_EASE, item.ease + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02)));

  let intervalDays: number;
  let reps = item.reps;
  let lapses = item.lapses;

  if (!passed) {
    lapses += 1;
    reps = 0;
    intervalDays = 0; // relearn today
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.round(item.intervalDays * ease);
  }

  return {
    ...item,
    familiarity: grade,
    ease,
    reps,
    lapses,
    intervalDays,
    lastReviewedAt: now,
    dueAt: now + intervalDays * DAY_MS,
  };
}

/** A card is due when its dueAt has passed. */
export function isDue(item: CollectionItem, now: number): boolean {
  return item.dueAt <= now;
}
