export interface Word {
  id: string;
  lesson: number;
  text: string;
  pos: string;
  ipa: string;
  meaning: string;
  definition: string;
  examples: { text: string; translation: string }[];
  family: { text: string; pos: string; meaning: string; parts?: string[] }[];
  synonyms: string[];
  antonyms: string[];
  parts: string[];
}
export interface Lesson {
  id: number;
  title: string;
  translation: string;
  topicId: string;
}
export interface Topic {
  id: string;
  title: string;
  english: string;
}
export interface Catalog {
  version: string;
  words: Word[];
  lessons: Lesson[];
  topics: Topic[];
}
export interface WordProgress {
  startedAt: number;
  startedDay: string;
  box: number;
  dueAt: number;
  correct: number;
  incorrect: number;
  reviewedDay?: string;
  tested: boolean;
  policyVersion: 1;
}
export type SessionMode = "learn" | "review" | "practice";
interface QuestionBase {
  wordId: string;
  prompt: string;
  answer: string;
}
export type ClozeChoiceQuestion = QuestionBase & {
  kind: "cloze-choice" | "word-form-choice";
  options: string[];
  sourceId: string;
  sourceVersion: string;
};
export type RecognitionQuestion = QuestionBase & { kind: "meaning" | "word-choice"; options: string[] };
export type SynonymQuestion = QuestionBase & {
  kind: "synonym-choice" | "synonym-context";
  options: string[];
  direction?: "synonym" | "antonym";
  target?: string;
  sourceId?: string;
  sourceVersion?: string;
};
export type WordFormQuestion = QuestionBase & {
  kind: "word-form";
  options?: [];
  sourceId?: string;
  sourceVersion?: string;
};
export type BuildQuestion = Omit<QuestionBase, "answer"> & {
  kind: "build";
  answer: string[];
  tiles: string[];
  form?: string;
  sourceId?: string;
  sourceVersion?: string;
  options?: [];
};
export type Question =
  | ClozeChoiceQuestion
  | RecognitionQuestion
  | SynonymQuestion
  | WordFormQuestion
  | BuildQuestion
  // Empty options are a schema-2 compatibility field, never selectable answers.
  | (QuestionBase & { kind: "cloze"; options?: [] })
  | (QuestionBase & { kind: "recall"; options?: [] });
export interface Feedback {
  correct: boolean;
  answer: string;
  assisted: boolean;
  input: string;
  selectedParts?: string[];
}
export interface StudySession {
  id: string;
  contentVersion: string;
  title: string;
  mode: SessionMode;
  questions: Question[];
  index: number;
  phase: "learn" | "question" | "feedback" | "complete";
  feedback: Feedback | null;
  startedAt: number;
  finishedAt?: number;
  peeked?: boolean;
  revealed?: number[];
  returnTo?: string;
}
export interface AnswerEvent {
  id: string;
  sessionId: string;
  wordId: string;
  at: number;
  day: string;
  correct: boolean;
  assisted: boolean;
  mode: SessionMode;
  // Optional only for historical events. New answers always record these fields.
  questionId?: string;
  questionKind?: Question["kind"];
  contentVersion?: string;
  skill?: "vocabulary";
  scoringVersion?: 1 | 2 | 3;
  sourceQuestionId?: string;
  sourceVersion?: string;
  hintCount?: number;
  direction?: "synonym" | "antonym";
  hintLimit?: number;
}
export interface SessionSummary {
  id: string;
  title: string;
  mode: SessionMode;
  at: number;
  correct: number;
  total: number;
  finished: boolean;
}
export interface Snapshot {
  schemaVersion: 2;
  revision: number;
  settings: { name: string; dailyNew: number; timezone: string; theme: "light" | "dark" | "system" };
  progress: Record<string, WordProgress>;
  events: AnswerEvent[];
  session: StudySession | null;
  history: SessionSummary[];
  customWords: Word[];
  imports: string[];
  legacyArchives: unknown[];
  savedWords?: string[];
}
