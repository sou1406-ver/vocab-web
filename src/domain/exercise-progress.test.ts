import { describe, expect, it } from "vitest";
import { exerciseProgress } from "./exercise-progress";
import type { AnswerEvent, Question } from "./types";

const event = (id: string, kind?: Question["kind"], patch: Partial<AnswerEvent> = {}): AnswerEvent => ({
  id,
  sessionId: "s",
  wordId: "word",
  at: 1,
  day: "2026-10-31",
  correct: true,
  assisted: false,
  mode: "practice",
  ...(kind ? { questionKind: kind } : {}),
  ...patch,
});

describe("Exercise group results", () => {
  it("leaves all six groups unmeasured when no questions were answered", () => {
    const groups = exerciseProgress([], new Set(["word"]));
    expect(groups).toHaveLength(6);
    for (const group of groups) expect(group).toMatchObject({ total: 0, correct: 0, accuracy: null });
  });
  it("groups every current question kind and counts match pairs separately", () => {
    const kinds: Question["kind"][] = [
      "meaning",
      "word-choice",
      "recall",
      "cloze",
      "cloze-choice",
      "word-form-choice",
      "word-form",
      "build",
      "synonym-choice",
      "synonym-context",
      "listen-choice",
      "listen-type",
      "match",
      "match",
    ];
    const groups = exerciseProgress(
      kinds.map((kind, i) => event(String(i), kind)),
      new Set(["word"]),
    );
    expect(groups.map((group) => group.total)).toEqual([2, 3, 3, 2, 2, 2]);
    expect(groups.every((group) => group.accuracy === 100)).toBe(true);
  });
  it("scopes to the selected book, ignores old unclassified events and does not reward assistance", () => {
    const events = [
      event("1", "meaning"),
      event("2", "word-choice", { correct: false }),
      event("3", "meaning", { assisted: true }),
      event("4", "meaning", { wordId: "other-book:word" }),
      event("5"),
    ];
    const before = structuredClone(events);
    expect(exerciseProgress(events, new Set(["word"]))[0]).toMatchObject({ total: 3, correct: 1, accuracy: 33 });
    expect(events).toEqual(before);
  });
});
