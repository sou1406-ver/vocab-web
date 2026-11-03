import { INTERVALS, TIMEZONE, dayKey, nextDue } from "./learning";
import type { AnswerEvent, Question, Snapshot } from "./types";

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

export interface SkillGap {
  wordId: string;
  weaker: Skill;
  recognition: number;
  recall: number;
}
/** Words whose two skills are at least `minGap` boxes apart (both tested), widest gap first. */
export function skillGaps(progress: SkillProgress, wordIds: readonly string[], minGap = 2): SkillGap[] {
  return wordIds
    .flatMap((wordId) => {
      const recognition = progress[wordId]?.recognition?.box;
      const recall = progress[wordId]?.recall?.box;
      if (recognition === undefined || recall === undefined || Math.abs(recognition - recall) < minGap) return [];
      return [
        { wordId, recognition, recall, weaker: recall < recognition ? ("recall" as const) : ("recognition" as const) },
      ];
    })
    .sort(
      (a, b) =>
        Math.abs(b.recognition - b.recall) - Math.abs(a.recognition - a.recall) || a.wordId.localeCompare(b.wordId),
    );
}

// Words first studied before two-skill scheduling shipped; their missing skill is mixed into reviews a few at a time.
export const TWO_SKILL_SINCE = Date.parse("2026-11-03T00:00:00+07:00");
export interface ReviewItem {
  wordId: string;
  skill: Skill;
  dueAt: number;
}
type ProgressMap = Snapshot["progress"];

/*
 * Today's two-skill review plan.
 * - A word reviews at most one skill per day: once any skill counted today, it waits until tomorrow.
 * - A skill with its own schedule is due at its dueAt; the earliest due skill of the word is chosen.
 * - Words with no skill history at all (older data, imports) keep the single legacy schedule and review recall,
 *   exactly as before.
 * - A missing skill of a word started after the switch is due one day after the word was started.
 * - A missing skill of an older word is not "due"; it is offered as an extra to slip quietly into reviews.
 */
export function planReviews(
  progress: ProgressMap,
  skills: SkillProgress,
  wordIds: Iterable<string>,
  at = Date.now(),
  timezone = TIMEZONE,
) {
  const today = dayKey(at, timezone);
  const due: ReviewItem[] = [];
  const extra: ReviewItem[] = [];
  for (const id of wordIds) {
    const word = progress[id];
    if (!word?.tested) continue;
    const states = skills[id] ?? {};
    const known = (["recognition", "recall"] as const).filter((skill) => states[skill]);
    if (known.some((skill) => states[skill]!.reviewedDay === today) || word.reviewedDay === today) continue;
    if (!known.length) {
      if (word.dueAt <= at) due.push({ wordId: id, skill: "recall", dueAt: word.dueAt });
      continue;
    }
    const candidates: ReviewItem[] = known
      .filter((skill) => states[skill]!.dueAt <= at)
      .map((skill) => ({ wordId: id, skill, dueAt: states[skill]!.dueAt }));
    const missing = (["recognition", "recall"] as const).find((skill) => !states[skill]);
    if (missing && word.startedAt >= TWO_SKILL_SINCE) {
      const pendingDue = nextDue(word.startedAt, INTERVALS[0], timezone);
      // Listed first so that, on a tie, the never-tested skill goes first (the sort below is stable).
      if (pendingDue <= at) candidates.unshift({ wordId: id, skill: missing, dueAt: pendingDue });
    }
    if (candidates.length) due.push(candidates.sort((a, b) => a.dueAt - b.dueAt)[0]);
    else if (missing) extra.push({ wordId: id, skill: missing, dueAt: word.startedAt });
  }
  due.sort((a, b) => a.dueAt - b.dueAt);
  extra.sort((a, b) => a.dueAt - b.dueAt);
  return { due, extra };
}

// "Nhớ ổn định" needs both skills at box 5+; words without skill history keep the legacy box.
export function isStable(states: Partial<Record<Skill, SkillState>> | undefined, legacyBox = 0) {
  if (!states?.recognition && !states?.recall) return legacyBox >= 5;
  return (states.recognition?.box ?? 0) >= 5 && (states.recall?.box ?? 0) >= 5;
}
