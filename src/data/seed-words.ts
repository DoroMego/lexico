import { CEFRLevel, PartOfSpeech, Gender } from '@/lib/types';
import wordbank from './wordbank.json';

/** Seed entry shape (no id — assigned on DB insert). */
export interface SeedWord {
  spanish: string;
  english: string;
  chinese: string;
  pos: PartOfSpeech;
  gender: Gender;
  level: CEFRLevel;
  exampleEs: string | null;
  exampleZh: string | null;
}

// Independently prepared 90-record public sample; never seeds production data.
export const SEED_WORDS: SeedWord[] = wordbank as SeedWord[];
