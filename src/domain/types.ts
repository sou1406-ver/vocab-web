export interface Word {
  id: string;
  lesson: number;
  text: string;
  pos: string;
  ipa: string;
  meaning: string;
  definition: string;
  examples: { text: string; translation: string }[];
  family: { text: string; pos: string; meaning: string }[];
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
export interface Question {
  wordId: string;
  kind: "meaning" | "cloze" | "recall";
  prompt: string;
  answer: string;
  options: string[];
}
export interface Feedback {
  correct: boolean;
  answer: string;
  assisted: boolean;
  input: string;
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
