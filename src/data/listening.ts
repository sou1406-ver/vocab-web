import { normalizeAnswer } from "../domain/learning";
import { shuffleSeeded } from "../domain/random";
import type { Catalog, ListeningQuestion, Word } from "../domain/types";
import { distractorPool, type TestedProgress } from "../domain/distractors";

export const LISTEN_PROMPTS = { "listen-choice": "Nghe và chọn từ.", "listen-type": "Nghe và gõ từ." } as const;
export function makeListeningQuestions(
  words: readonly Word[],
  catalog: Catalog,
  kind: ListeningQuestion["kind"],
  sessionId: string,
  progress: TestedProgress = {},
): ListeningQuestion[] {
  return words.flatMap((word): ListeningQuestion[] => {
    const base = {
      wordId: word.id,
      prompt: LISTEN_PROMPTS[kind],
      answer: word.text,
      sourceId: `${kind}:${word.id}`,
      sourceVersion: catalog.version,
    };
    if (kind === "listen-type") return [{ ...base, kind, options: [] }];
    const key = normalizeAnswer(word.text);
    const letters = (text: string) => Array.from(text).filter((char) => /\p{L}/u.test(char));
    const similar = (candidate: Word) =>
      normalizeAnswer(candidate.text)[0] === key[0] ||
      Math.abs(letters(candidate.text).length - letters(word.text).length) <= 2;
    const eligible = distractorPool(word, catalog.words, progress, sessionId);
    // Keep the eligibility/tier order; sound similarity only breaks ties inside
    // lesson/learned roots, before considering family forms as the final fallback.
    const roots = eligible.filter((candidate) => !candidate.id.startsWith("family:"));
    const forms = eligible.filter((candidate) => candidate.id.startsWith("family:"));
    const samePos = (candidate: Word) =>
      normalizeAnswer(candidate.pos).replace(/\./g, "") === normalizeAnswer(word.pos).replace(/\./g, "");
    const candidates = [roots.filter(samePos), roots.filter((candidate) => !samePos(candidate))].flatMap((tier) => [
      tier.filter(similar).map((candidate) => candidate.text),
      tier.filter((candidate) => !similar(candidate)).map((candidate) => candidate.text),
    ]);
    candidates.push(forms.map((candidate) => candidate.text));
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
