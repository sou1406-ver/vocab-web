import { normalizeAnswer } from "../domain/learning";
import { shuffleSeeded } from "../domain/random";
import type { Catalog, ListeningQuestion, Word } from "../domain/types";

export const LISTEN_PROMPTS = { "listen-choice": "Nghe và chọn từ.", "listen-type": "Nghe và gõ từ." } as const;
export function makeListeningQuestions(
  words: readonly Word[],
  catalog: Catalog,
  kind: ListeningQuestion["kind"],
  sessionId: string,
): ListeningQuestion[] {
  const topics = new Map(catalog.lessons.map((lesson) => [lesson.id, lesson.topicId]));
  return words.flatMap((word): ListeningQuestion[] => {
    const base = {
      wordId: word.id,
      prompt: LISTEN_PROMPTS[kind],
      answer: word.text,
      sourceId: `${kind}:${word.id}`,
      sourceVersion: catalog.version,
    };
    if (kind === "listen-type") return [{ ...base, kind, options: [] }];
    const topic = topics.get(word.lesson);
    const nearby = (candidate: Word) =>
      candidate.lesson === word.lesson || (topic !== undefined && topics.get(candidate.lesson) === topic);
    const key = normalizeAnswer(word.text);
    const letters = (text: string) => Array.from(text).filter((char) => /\p{L}/u.test(char));
    const similar = (candidate: Word) =>
      normalizeAnswer(candidate.text)[0] === key[0] ||
      Math.abs(letters(candidate.text).length - letters(word.text).length) <= 2;
    const candidates = [
      shuffleSeeded(
        word.family.map((form) => form.text),
        `${sessionId}:${word.id}:family`,
      ),
      shuffleSeeded(
        catalog.words.filter((candidate) => nearby(candidate) && similar(candidate)).map((candidate) => candidate.text),
        `${sessionId}:${word.id}:near-sound`,
      ),
      shuffleSeeded(
        catalog.words.filter(nearby).map((candidate) => candidate.text),
        `${sessionId}:${word.id}:near`,
      ),
      shuffleSeeded(
        catalog.words.filter(similar).map((candidate) => candidate.text),
        `${sessionId}:${word.id}:sound`,
      ),
      shuffleSeeded(
        catalog.words.map((candidate) => candidate.text),
        `${sessionId}:${word.id}:fallback`,
      ),
    ];
    const seen = new Set([key]);
    const wrong: string[] = [];
    for (const pool of candidates) {
      for (const value of pool) {
        const normalized = normalizeAnswer(value);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        wrong.push(value.trim());
        if (wrong.length === 3) break;
      }
      if (wrong.length === 3) break;
    }
    return wrong.length === 3
      ? [{ ...base, kind, options: shuffleSeeded([word.text, ...wrong], `${sessionId}:${word.id}:options`) }]
      : [];
  });
}
