import { shuffleSeeded } from "./random";
import type { RootEntry } from "./roots";

export interface RootQuizQuestion {
  /** "meaning": English word shown, pick its Vietnamese meaning. "word": the reverse. */
  kind: "meaning" | "word";
  prompt: string;
  options: string[];
  answer: string;
  logic: string;
}

const MAX_QUESTIONS = 5;

/**
 * A short self-check for one root page. Practice only: it never touches progress, events or the review schedule.
 * Distractors come from the same root first (the hard, useful contrast), then from the other roots.
 */
export function makeRootQuiz(root: RootEntry, all: readonly RootEntry[], seed = root.id): RootQuizQuestion[] {
  const others = all.filter((item) => item.id !== root.id).flatMap((item) => item.words);
  const pool = [...root.words, ...shuffleSeeded(others, `${seed}:others`)];
  return shuffleSeeded(root.words, seed)
    .slice(0, MAX_QUESTIONS)
    .map((word, index) => {
      const kind = index % 2 === 0 ? "meaning" : "word";
      const pick = (entry: (typeof pool)[number]) => (kind === "meaning" ? entry.meaning : entry.text);
      const answer = pick(word);
      const distractors: string[] = [];
      for (const entry of pool) {
        const option = pick(entry);
        if (option !== answer && !distractors.includes(option) && entry.meaning !== word.meaning)
          distractors.push(option);
        if (distractors.length === 3) break;
      }
      return {
        kind,
        prompt: kind === "meaning" ? word.text : word.meaning,
        options: shuffleSeeded([answer, ...distractors], `${seed}:${word.text}`),
        answer,
        logic: word.logic,
      };
    });
}
