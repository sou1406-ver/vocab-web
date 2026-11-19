import { learningItems } from "../../scripts/lib/learning-items.mjs";
export { learningItems };
import type { Snapshot, Word } from "./types";
import { latestSenseOutcome } from "./sense-check";

export interface Sense {
  id: string;
  pos: string;
  ipa?: string;
  pronunciation?: Pronunciation;
  rank?: "primary" | "secondary";
  meaning: string;
  explanation: string;
  definition: string;
  examples: { text: string; translation: string }[];
  patterns: string[];
  synonyms: string[];
  antonyms: string[];
  status: "draft" | "reviewed";
  sources: { kind: "book" | "dictionary" | "editorial"; reference: string }[];
}
export interface Lexeme {
  id: string;
  text: string;
  forms?: string[];
  rootIds?: string[];
  pronunciation?: Pronunciation;
  core?: { meaning: string; image?: string; note?: string };
  senses: Sense[];
}
export interface SenseCheck {
  wordId: string;
  lexemeId: string;
  senseId: string;
  itemIds: string[];
  requiredItemIds: string[];
  role: "scheduled" | "diagnostic" | "repair";
}
export const studyWords = (words: readonly Word[]) => words.flatMap(learningItems);
export function mergeReviewGroups<T extends { wordId: string }>(
  due: readonly T[],
  extra: readonly T[],
  words: readonly Word[],
) {
  const groups = new Map(words.map((word) => [word.id, word.groupWordId ?? word.id]));
  const seen = new Set<string>();
  const unique = (items: readonly T[]) =>
    items.filter((item) => {
      const group = groups.get(item.wordId) ?? item.wordId;
      if (seen.has(group)) return false;
      seen.add(group);
      return true;
    });
  return { due: unique(due), extra: unique(extra) };
}
export const sameLexeme = (a: Word, b: Word) =>
  Boolean(a.lexeme && b.lexeme && a.lexeme.id === b.lexeme.id) ||
  a.text.trim().toLowerCase() === b.text.trim().toLowerCase();
export function needsLearning(word: Word, snapshot: Snapshot) {
  const result = latestSenseOutcome(snapshot.events, word.groupWordId ?? word.id);
  return (
    learningItems(word).some((item) => !snapshot.progress[item.id]?.tested) || (result !== null && result !== "passed")
  );
}

export interface Pronunciation {
  us: string;
  uk: string;
}
export interface CanonicalSense {
  id: string;
  rank: "primary" | "secondary";
  status: "draft" | "reviewed";
  pos?: string;
  ipa?: Pronunciation;
  meaningVi?: string;
  explanationVi?: string;
  definitionEn?: string;
  examples?: { en: string; vi: string }[];
  patterns?: string[];
  synonyms?: string[];
  antonyms?: string[];
  noSynonyms?: true;
  sources?: Sense["sources"];
}
export interface CanonicalEntry {
  id: string;
  text: string;
  ipa: Pronunciation;
  forms: string[];
  family: Word["family"];
  rootIds?: string[];
  core?: Lexeme["core"];
  senses: CanonicalSense[];
}
export interface BookLexiconSource {
  flatWords: Word[];
  entries: CanonicalEntry[];
  bindings: { version: 2; items: { wordId: string; entryId: string; taught: string[] }[] };
  rootIds: string[];
}
