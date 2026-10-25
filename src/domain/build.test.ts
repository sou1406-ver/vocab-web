import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { validateSnapshot } from "../data/validation";
import { answerQuestion, beginExerciseSession, emptySnapshot, revealQuestionLetter } from "./learning";
import type { BuildQuestion } from "./types";

const question: BuildQuestion = {
  kind: "build",
  wordId: catalog.words[0].id,
  prompt: "niềm hạnh phúc (n)",
  form: "happiness",
  answer: ["happy", "-ness"],
  tiles: ["un-", "-ly", "happy", "-ness", "-ment"],
  sourceId: `build:${catalog.words[0].id}:happiness`,
  sourceVersion: catalog.version,
};
const start = () => beginExerciseSession(emptySnapshot(), catalog, [structuredClone(question)], "Ghép từ", "b", 100);

describe("Build answers and compatibility", () => {
  it("saves build questions in schema 2 and reads old question/feedback payloads unchanged", () => {
    const state = start();
    expect(validateSnapshot(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(state.schemaVersion).toBe(2);
    const legacy = beginExerciseSession(
      emptySnapshot(),
      catalog,
      [
        {
          kind: "recall",
          wordId: question.wordId,
          prompt: "nghĩa",
          answer: "word",
          options: [],
        },
      ],
      "Old",
      "old",
      100,
    );
    const answered = answerQuestion(legacy, "old", 0, "word", false, 101);
    expect(validateSnapshot(JSON.parse(JSON.stringify(answered)))).toEqual(answered);
    expect(answered.session!.feedback).not.toHaveProperty("selectedParts");
    const optional = structuredClone(state);
    const q = optional.session!.questions[0] as BuildQuestion;
    delete q.form;
    delete q.sourceId;
    delete q.sourceVersion;
    expect(validateSnapshot(optional)).toBe(optional);
  });
  it.each([
    { input: ["happy", "-ness"], correct: true },
    { input: ["-ness", "happy"], correct: false },
    { input: ["happy", "-ly"], correct: false },
    { input: ["happy"], correct: false },
    { input: "happiness", correct: false },
  ])("grades the ordered parts $input as $correct", ({ input, correct }) => {
    const state = answerQuestion(start(), "b", 0, input, false, 101);
    expect(state.events[0]).toMatchObject({
      id: "b:0",
      questionId: "b:0",
      questionKind: "build",
      mode: "practice",
      sourceQuestionId: question.sourceId,
      sourceVersion: catalog.version,
      scoringVersion: 3,
      hintCount: 0,
      hintLimit: 0,
      correct,
    });
    expect(state.session!.feedback).toMatchObject({
      answer: "happiness",
      selectedParts: Array.isArray(input) ? input : [],
    });
    expect(state.progress).toEqual({});
    expect(validateSnapshot(state)).toBe(state);
    expect(answerQuestion(state, "b", 0, input, false, 102).events).toHaveLength(1);
  });
  it("does not promote an existing word or allow letter hints", () => {
    const state = start();
    state.progress[question.wordId] = {
      box: 4,
      dueAt: 1,
      reviewedDay: "2026-10-24",
      startedAt: 1,
      startedDay: "2026-10-24",
      correct: 3,
      incorrect: 0,
      tested: true,
      policyVersion: 1,
    };
    expect(() => revealQuestionLetter(state, "b", 0)).toThrow();
    const answered = answerQuestion(state, "b", 0, question.answer, false, 101);
    expect(answered.progress[question.wordId]).toMatchObject({ box: 4, dueAt: 1, reviewedDay: "2026-10-24" });
  });
  it("rejects different segmentation even when the assembled letters are identical", () => {
    const state = start();
    Object.assign(state.session!.questions[0], {
      form: "abc",
      answer: ["ab", "c"],
      tiles: ["ab", "c", "a", "bc", "un-"],
    });
    const answered = answerQuestion(state, "b", 0, ["a", "bc"], false, 101);
    expect(answered.events[0].correct).toBe(false);
    expect(validateSnapshot(answered)).toBe(answered);
  });
  it("rejects duplicate tiles, missing answer pieces, malformed arrays and build outside practice", () => {
    for (const patch of [
      { tiles: ["happy", "happy", "-ness", "-ly", "un-"] },
      { tiles: ["happy", "-ment", "-ly", "un-", "re-"] },
      { answer: "happiness" },
      { answer: ["happy", "happy"] },
      { answer: ["happy", 1] },
      { tiles: ["happy", "-ness"] },
      { form: 1 },
      { options: ["wrong"] },
    ]) {
      const state = start();
      Object.assign(state.session!.questions[0], patch);
      expect(() => validateSnapshot(state)).toThrow();
    }
    for (const mode of ["learn", "review"] as const) {
      const state = start();
      state.session!.mode = mode;
      expect(() => validateSnapshot(state)).toThrow();
      expect(() => answerQuestion(state, "b", 0, question.answer, false, 101)).toThrow();
    }
  });
  it("validates optional saved selections and Build scoring metadata", () => {
    const answered = answerQuestion(start(), "b", 0, question.answer, false, 101);
    for (const selectedParts of [["happy", "happy"], ["unknown"], "happy"]) {
      const bad = structuredClone(answered);
      Object.assign(bad.session!.feedback!, { selectedParts });
      expect(() => validateSnapshot(bad)).toThrow();
    }
    const noSelection = structuredClone(answered);
    delete noSelection.session!.feedback!.selectedParts;
    expect(validateSnapshot(noSelection)).toBe(noSelection);
    for (const patch of [{ hintCount: 1 }, { hintLimit: 1 }, { questionKind: "recall" }, { mode: "review" }]) {
      const bad = structuredClone(answered);
      Object.assign(bad.events[0], patch);
      expect(() => validateSnapshot(bad)).toThrow();
    }
  });
});
