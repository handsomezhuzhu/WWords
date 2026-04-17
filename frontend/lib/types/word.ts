import type { ExampleSentence } from "@/lib/types/review";

export interface WordRecord {
  id: number;
  english: string | null;
  chinese: string | null;
  phonetics: string | null;
  definition: string | null;
  part_of_speech: string | null;
  parts_of_speech: string | null;
  examples: string | null;
  next_review_at: string;
  interval_index: number;
  success_streak: number;
}

export interface WordListResponse {
  items: WordRecord[];
  total: number;
  page: number;
  page_size: number;
  due_total: number;
  active_total: number;
  stable_total: number;
}

export interface WordDraft {
  english?: string | null;
  chinese?: string | null;
  phonetics?: string | null;
  definition?: string | null;
  part_of_speech?: string | null;
  parts_of_speech?: string | null;
  examples?: string | null;
}

export interface PhoneticsMap {
  uk?: string | null;
  us?: string | null;
}

export interface PartOfSpeechEntry {
  pos: string;
  meaningEn?: string | null;
  meaningZh?: string | null;
}

export interface AICompletionRequest {
  word: string;
  direction?: "en_to_zh" | "zh_to_en";
}

export interface AICompletionResponse {
  word: string;
  phonetics: PhoneticsMap | null;
  partsOfSpeech: PartOfSpeechEntry[];
  examples: ExampleSentence[];
  synonyms: string[];
  antonyms: string[];
  direction: string;
}
