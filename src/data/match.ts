import { normalizeAnswer } from "../domain/learning";
import { shuffleSeeded } from "../domain/random";
import type { Catalog, MatchQuestion, Snapshot, Word } from "../domain/types";

export const matchGlosses = (meaning: string) =>
  normalizeAnswer(meaning)
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
export const matchMeaningsOverlap = (a: string, b: string) =>
  matchGlosses(a).some((left) => matchGlosses(b).some((right) => left.includes(right) || right.includes(left)));

export function makeMatchQuestions(
  catalog: Catalog,
  topicId: string,
  progress: Snapshot["progress"],
  sessionId: string,
): MatchQuestion[] {
  const lessons = new Set(catalog.lessons.filter((lesson) => lesson.topicId === topicId).map((lesson) => lesson.id));
  const pool = catalog.words.filter(
    (word) => lessons.has(word.lesson) && normalizeAnswer(word.text) && matchGlosses(word.meaning).length,
  );
  const candidates = [
    ...shuffleSeeded(
      pool.filter((word) => progress[word.id]?.tested),
      `${sessionId}:${topicId}:tested`,
    ),
    ...shuffleSeeded(
      pool.filter((word) => !progress[word.id]?.tested),
      `${sessionId}:${topicId}:untested`,
    ),
  ];
  const chosen: Word[] = [];
  for (const word of candidates) {
    if (
      chosen.some(
        (other) =>
          other.id === word.id ||
          normalizeAnswer(other.text) === normalizeAnswer(word.text) ||
          matchMeaningsOverlap(other.meaning, word.meaning),
      )
    )
      continue;
    chosen.push(word);
    if (chosen.length === 6) break;
  }
  if (chosen.length !== 6) return [];
  return shuffleSeeded(chosen, `${sessionId}:${topicId}:left`).map((word) => ({
    kind: "match",
    wordId: word.id,
    prompt: word.text,
    answer: word.meaning,
    groupId: `${sessionId}:match:${topicId}`,
    sourceId: `match:${topicId}:${word.id}`,
    sourceVersion: catalog.version,
  }));
}
