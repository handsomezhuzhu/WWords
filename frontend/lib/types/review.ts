export type ReviewMode = "en_to_zh" | "zh_to_en";

export interface ExampleSentence {
  sentenceEn: string;
  sentenceZh: string;
}

export interface ReviewRequest {
  count: number;
  mode: ReviewMode;
}

export interface ReviewItem {
  id: number;
  question: string;
  answer: string;
  examples: ExampleSentence[];
}

export interface ReviewAnswer {
  grade: 0 | 1 | 2;
}

