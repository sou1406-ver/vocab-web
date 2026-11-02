import { describe, expect, it } from "vitest";
import { replaySkills, skillOf, summariseSkills } from "./skills";
import { INTERVALS, nextDue } from "./learning";
import type { AnswerEvent } from "./types";

const DAY = 86_400_000;
const start = Date.parse("2026-10-01T03:00:00Z");
let n = 0;
const answer = (
  at: number,
  kind: AnswerEvent["questionKind"],
  mode: AnswerEvent["mode"],
  correct = true,
  extra: Partial<AnswerEvent> = {},
): AnswerEvent => ({
  id: `s:${n++}`,
  sessionId: "s",
  wordId: "w",
  at,
  day: "",
  correct,
  assisted: false,
  mode,
  questionKind: kind,
  ...extra,
});

describe("two-skill replay", () => {
  it("maps picking to recognition and typing to recall, and never guesses old events", () => {
    expect(skillOf("meaning")).toBe("recognition");
    expect(skillOf("cloze-choice")).toBe("recognition");
    expect(skillOf("listen-choice")).toBe("recognition");
    expect(skillOf("recall")).toBe("recall");
    expect(skillOf("word-form")).toBe("recall");
    expect(skillOf("listen-type")).toBe("recall");
    expect(skillOf(undefined)).toBeNull();
    expect(replaySkills([{ ...answer(start, undefined, "learn") }])).toEqual({});
  });
  it("schedules each skill on its own with the familiar intervals", () => {
    const events = [
      answer(start, "meaning", "learn"),
      answer(start + 1000, "recall", "learn", false),
      answer(start + DAY, "meaning", "review"),
      answer(start + DAY + 1000, "recall", "review", false),
    ];
    const word = replaySkills(events).w;
    expect(word.recognition).toMatchObject({ box: 2, correct: 2, incorrect: 0 });
    expect(word.recognition!.dueAt).toBe(nextDue(start + DAY, INTERVALS[1]));
    expect(word.recall).toMatchObject({ box: 1, correct: 0, incorrect: 2 });
  });
  it("counts one review per day, ignores early reviews and practice, and resets on assisted answers", () => {
    const events = [
      answer(start, "meaning", "learn"),
      answer(start + 1000, "meaning", "review"),
      answer(start + DAY, "meaning", "review"),
      answer(start + DAY + 1000, "meaning", "review"),
      answer(start + DAY + 2000, "meaning", "practice", false),
      answer(start + 4 * DAY, "meaning", "review", false, { assisted: true }),
    ];
    const state = replaySkills(events).w.recognition!;
    expect(state.box).toBe(1);
    expect(state.correct).toBe(4);
    expect(state.incorrect).toBe(1);
  });
  it("summarises tested, stable and due words per skill", () => {
    const events = [answer(start, "meaning", "learn"), answer(start, "recall", "learn", true, { wordId: "v" })];
    const summary = summariseSkills(replaySkills(events), ["w", "v", "x"], start + 2 * DAY);
    expect(summary).toEqual({
      recognition: { tested: 1, stable: 0, due: 1 },
      recall: { tested: 1, stable: 0, due: 1 },
    });
  });
});
