import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { validateSnapshot } from "../data/validation";
import { answerQuestion, beginExerciseSession, emptySnapshot } from "./learning";
import type { SynonymQuestion } from "./types";

const choice: SynonymQuestion = {
  kind: "synonym-choice",
  wordId: catalog.words[0].id,
  prompt: "TRÁI NGHĨA: engage",
  answer: "disengage",
  options: ["disengage", "inspect", "measure", "deliver"],
  direction: "antonym",
};
const context: SynonymQuestion = {
  ...choice,
  kind: "synonym-context",
  prompt: "They engage in discussions.",
  target: "engage",
  answer: "participate",
  options: ["participate", "inspect", "measure", "deliver"],
  direction: "synonym",
};
const start = (q = choice) => beginExerciseSession(emptySnapshot(), catalog, [q], "Synonyms", "s", 100);

describe("Synonym practice contracts", () => {
  it.each([choice, context])("persists and grades $kind with its direction in practice", (q) => {
    const state = start(q);
    expect(validateSnapshot(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const answered = answerQuestion(state, "s", 0, q.answer, false, 101);
    expect(answered.events[0]).toMatchObject({
      questionKind: q.kind,
      direction: q.direction,
      mode: "practice",
      correct: true,
      scoringVersion: 2,
      hintCount: 0,
      hintLimit: 0,
      id: "s:0",
    });
    expect(answered.progress).toEqual({});
    expect(validateSnapshot(answered)).toBe(answered);
  });
  it("reads old questions and events without adding a direction or changing schema 2", () => {
    const state = beginExerciseSession(
      emptySnapshot(),
      catalog,
      [
        {
          kind: "meaning",
          wordId: choice.wordId,
          prompt: "word",
          answer: "nghĩa",
          options: ["nghĩa", "khác"],
        },
      ],
      "Old",
      "old",
      100,
    );
    const old = answerQuestion(state, "old", 0, "nghĩa", false, 101);
    expect(validateSnapshot(old)).toBe(old);
    expect(old.events[0]).not.toHaveProperty("direction");
    expect(old.schemaVersion).toBe(2);
    const compatible = start({ ...context, direction: undefined, target: undefined });
    expect(validateSnapshot(compatible)).toBe(compatible);
  });
  it("requires four normalized distinct options, a correct answer and consistent direction labels", () => {
    for (const patch of [
      { options: ["disengage", "inspect", "measure"] },
      { options: ["disengage", "DISENGAGE", "measure", "deliver"] },
      { answer: "not-an-option" },
      { direction: "unknown" },
      { prompt: "engage" },
    ]) {
      const state = start();
      Object.assign(state.session!.questions[0], patch);
      expect(() => validateSnapshot(state)).toThrow();
    }
    for (const patch of [
      { target: "missing" },
      { target: 1 },
      { prompt: "engage and engage" },
      { direction: "antonym" },
    ]) {
      const state = start(context);
      Object.assign(state.session!.questions[0], patch);
      expect(() => validateSnapshot(state)).toThrow();
    }
  });
  it("preserves existing scheduling and rejects synonym questions outside practice", () => {
    const state = start();
    state.progress[choice.wordId] = {
      startedAt: 1,
      startedDay: "2026-10-24",
      box: 4,
      dueAt: 2,
      reviewedDay: "2026-10-24",
      correct: 4,
      incorrect: 0,
      tested: true,
      policyVersion: 1,
    };
    const answered = answerQuestion(state, "s", 0, choice.answer, false, 101);
    expect(answered.progress[choice.wordId]).toMatchObject({ box: 4, dueAt: 2, reviewedDay: "2026-10-24" });
    for (const mode of ["learn", "review"] as const) {
      const bad = start();
      bad.session!.mode = mode;
      expect(() => validateSnapshot(bad)).toThrow();
      expect(() => answerQuestion(bad, "s", 0, choice.answer, false, 101)).toThrow();
    }
  });
  it("rejects invalid or opposite direction metadata on context events", () => {
    for (const [q, direction] of [
      [choice, "unknown"],
      [context, "antonym"],
    ] as const) {
      const state = answerQuestion(start(q), "s", 0, q.answer, false, 101);
      Object.assign(state.events[0], { direction });
      expect(() => validateSnapshot(state)).toThrow();
    }
  });
});
