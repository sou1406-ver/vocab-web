import type { Snapshot, Word } from "./types";
import { latestSenseOutcome } from "./sense-check";

export interface Sense {
  id: string;
  pos: string;
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
export function learningItems(word: Word): Word[] {
  if (!word.lexeme || !word.learningItems) return [word];
  return word.learningItems.flatMap((item) => {
    const sense = word.lexeme!.senses.find((s) => s.id === item.senseId && s.status === "reviewed");
    return sense
      ? [
          {
            ...word,
            ...sense,
            id: item.id,
            text: word.text,
            senseId: sense.id,
            groupWordId: word.groupWordId ?? word.id,
          },
        ]
      : [];
  });
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
