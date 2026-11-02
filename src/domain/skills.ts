import { INTERVALS, TIMEZONE, dayKey, nextDue } from "./learning";
import type { AnswerEvent, Question } from "./types";

/*
 * Read-only view of the two planned skills (LEARNING-CONTRACTS §3), rebuilt from the answer log.
 * - Nhận biết (recognition): picking an answer. Tự nhớ (recall): typing it.
 * - The same scheduling rules as today's single box, applied per word + skill:
 *   a learn answer starts box 1; an on-time review moves the box (wrong or assisted resets it);
 *   one counted review per word + skill + day; practice never schedules.
 * - Events without a question kind (older than scoringVersion 2) are skipped, never guessed.
 * Today's real schedule still uses WordProgress; nothing here is stored or synced.
 */
export type Skill = "recognition" | "recall";
export const skillLabels: Record<Skill, string> = { recognition: "Nhận biết", recall: "Tự nhớ" };
const RECALL: readonly Question["kind"][] = ["recall", "cloze", "word-form", "listen-type"];
const RECOGNITION: readonly Question["kind"][] = [
  "meaning",
  "word-choice",
  "cloze-choice",
  "word-form-choice",
  "synonym-choice",
  "synonym-context",
  "listen-choice",
  "build",
  "match",
];
export function skillOf(kind: AnswerEvent["questionKind"]): Skill | null {
  if (!kind) return null;
  if (RECALL.includes(kind)) return "recall";
  if (RECOGNITION.includes(kind)) return "recognition";
  return null;
}

export interface SkillState {
  box: number;
  dueAt: number;
  reviewedDay?: string;
  correct: number;
  incorrect: number;
}
export type SkillProgress = Record<string, Partial<Record<Skill, SkillState>>>;

export function replaySkills(events: readonly AnswerEvent[], timezone = TIMEZONE): SkillProgress {
  const progress: SkillProgress = {};
  const ordered = [...events].filter((event) => Number.isFinite(event.at)).sort((a, b) => a.at - b.at);
  for (const event of ordered) {
    const skill = skillOf(event.questionKind);
    if (!skill || event.mode === "practice") continue;
    const word = (progress[event.wordId] ??= {});
    const day = dayKey(event.at, timezone);
    const state = word[skill];
    if (!state) {
      // First scheduled answer for this skill (a learn answer, or a review of a word first tested in the other skill).
      word[skill] = {
        box: 1,
        dueAt: nextDue(event.at, INTERVALS[0], timezone),
        reviewedDay: event.mode === "review" ? day : undefined,
        correct: Number(event.correct),
        incorrect: Number(!event.correct),
      };
      continue;
    }
    state.correct += Number(event.correct);
    state.incorrect += Number(!event.correct);
    if (event.mode !== "review" || state.dueAt > event.at || state.reviewedDay === day) continue;
    state.box = event.correct && !event.assisted ? Math.min(INTERVALS.length, state.box + 1) : 1;
    state.dueAt = nextDue(event.at, INTERVALS[state.box - 1], timezone);
    state.reviewedDay = day;
  }
  return progress;
}

export interface SkillSummary {
  tested: number;
  stable: number;
  due: number;
}
// Counts for the given words: tested in the skill, stable (box 5+), and due now.
export function summariseSkills(progress: SkillProgress, wordIds: readonly string[], at = Date.now()) {
  const empty = (): SkillSummary => ({ tested: 0, stable: 0, due: 0 });
  const summary: Record<Skill, SkillSummary> = { recognition: empty(), recall: empty() };
  for (const id of wordIds)
    for (const skill of ["recognition", "recall"] as const) {
      const state = progress[id]?.[skill];
      if (!state) continue;
      summary[skill].tested++;
      if (state.box >= 5) summary[skill].stable++;
      if (state.dueAt <= at) summary[skill].due++;
    }
  return summary;
}
