import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { catalog } from "./catalog";
import { clozeLessons, makeWordFormQuestions, validateClozePack } from "./cloze";
import { validateSnapshot } from "./validation";
import { answerQuestion, beginExerciseSession, emptySnapshot, revealQuestionLetter } from "../domain/learning";
import type { ClozeChoiceQuestion } from "../domain/types";

const source: ClozeChoiceQuestion = {
  kind: "word-form-choice",
  wordId: catalog.words.find((word) => word.text === "agreement")!.id,
  prompt: "They were no closer to a final ________ at midnight.",
  answer: "agreement",
  options: ["agreement", "agreeable", "agreed", "agree"],
  sourceId: "v1:part5:1:10",
  sourceVersion: "authored-v1",
};
const start = () =>
  beginExerciseSession(emptySnapshot(), catalog, makeWordFormQuestions([source]), "Word form", "s", 100);

describe("Typed word form", () => {
  it("uses the shortest different option as the cue, preserving the source and answer", () => {
    const original = structuredClone(source);
    expect(makeWordFormQuestions([source, { ...source, kind: "cloze-choice" }])).toEqual([
      {
        kind: "word-form",
        wordId: source.wordId,
        prompt: "They were no closer to a final ________ at midnight. (agree)",
        answer: "agreement",
        options: [],
        sourceId: source.sourceId,
        sourceVersion: source.sourceVersion,
      },
    ]);
    expect(source).toEqual(original);
  });
  it.each([
    ["compare", ["compare", "comparison", "comparable", "compares"], "compares"],
    ["provides", ["provides", "provide", "provided", "providing"], "provide"],
    ["hired", ["hired", "hire", "hiring", "hires"], "hire"],
    ["will revise", ["will revise", "revision", "revised", "revise"], "revise"],
    ["built up", ["built up", "build", "building", "builder"], "build"],
    ["accustomed to", ["accustomed to", "accustomed", "accustom", "accustoming"], "accustom"],
    ["agreement", [" AGREEMENT ", " agrees ", "agreed", "agreeing"], "agrees"],
  ])("keeps the authored answer %s intact with a different shortest cue", (answer, options, cue) => {
    const [q] = makeWordFormQuestions([{ ...source, answer, options }]);
    expect(q.answer).toBe(answer);
    expect(q.prompt).toBe(`${source.prompt} (${cue})`);
  });
  it("rejects a source with no different nonempty cue", () => {
    expect(() => makeWordFormQuestions([{ ...source, options: ["agreement", " AGREEMENT ", "", " "] }])).toThrow();
  });
  it("converts all 299 authored questions without replacing inflected or multiword answers", () => {
    let count = 0;
    const phrases: string[] = [];
    for (const entry of clozeLessons) {
      const pack = JSON.parse(readFileSync(new URL(`../../public${entry.url}`, import.meta.url), "utf8"));
      const choices = validateClozePack(pack, entry).filter((q) => q.kind === "word-form-choice");
      const typed = makeWordFormQuestions(choices);
      expect(typed.map((q) => q.answer)).toEqual(choices.map((q) => q.answer));
      for (const [index, q] of typed.entries()) {
        const eligible = choices[index].options.filter((option) => option !== q.answer);
        const shortest = Math.min(...eligible.map((option) => Array.from(option.trim()).length));
        const cue = eligible.find((option) => Array.from(option.trim()).length === shortest)!.trim();
        expect(q.prompt).toBe(`${choices[index].prompt} (${cue})`);
        if (q.answer.includes(" ")) phrases.push(q.answer);
      }
      count += typed.length;
    }
    expect(count).toBe(299);
    expect(phrases.sort()).toEqual(["accustomed to", "built up"]);
  });
  it("reads old schema-2 questions/events and optional source metadata without rewriting them", () => {
    const legacy = beginExerciseSession(emptySnapshot(), catalog, [source], "Old form", "old", 100);
    const answered = answerQuestion(legacy, "old", 0, source.answer, false, 101);
    const state = start();
    state.events = answered.events;
    expect(validateSnapshot(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const compatible = JSON.parse(JSON.stringify(state));
    delete compatible.session.questions[0].options;
    delete compatible.session.questions[0].sourceId;
    delete compatible.session.questions[0].sourceVersion;
    expect(validateSnapshot(compatible)).toBe(compatible);
    expect(validateSnapshot(legacy)).toBe(legacy);
    expect(state.schemaVersion).toBe(2);
  });
  it("rejects invalid typed options, source metadata and missing blanks", () => {
    for (const patch of [
      { options: ["agreement"] },
      { sourceId: "" },
      { sourceVersion: "" },
      { sourceVersion: undefined },
      { prompt: "No blank (agree)" },
    ]) {
      const state = start();
      Object.assign(state.session!.questions[0], patch);
      expect(() => validateSnapshot(state)).toThrow();
    }
  });
  it("credits hints within 30 percent and records word-form provenance once in practice", () => {
    let state = start();
    state = revealQuestionLetter(state, "s", 0);
    state = revealQuestionLetter(state, "s", 0);
    expect(validateSnapshot(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const answered = answerQuestion(state, "s", 0, " AGREEMENT ", false, 101);
    expect(answered.events[0]).toMatchObject({
      id: "s:0",
      questionId: "s:0",
      questionKind: "word-form",
      mode: "practice",
      sourceQuestionId: source.sourceId,
      sourceVersion: source.sourceVersion,
      contentVersion: catalog.version,
      scoringVersion: 2,
      hintCount: 2,
      hintLimit: 2,
      correct: true,
      assisted: false,
    });
    expect(answered.progress).toEqual({});
    expect(validateSnapshot(answered)).toBe(answered);
    expect(answerQuestion(answered, "s", 0, source.answer, false, 102).events).toHaveLength(1);
  });
  it("marks hints beyond the allowance assisted and preserves existing review scheduling", () => {
    let state = start();
    const progress = {
      startedAt: 1,
      startedDay: "2026-10-24",
      box: 3,
      dueAt: 2,
      reviewedDay: "2026-10-24",
      correct: 4,
      incorrect: 0,
      tested: true,
      policyVersion: 1 as const,
    };
    state.progress[source.wordId] = progress;
    for (let index = 0; index < 3; index++) state = revealQuestionLetter(state, "s", 0);
    const answered = answerQuestion(state, "s", 0, source.answer, false, 101);
    expect(answered.events[0]).toMatchObject({ correct: false, assisted: true, hintCount: 3, hintLimit: 2 });
    expect(answered.progress[source.wordId]).toMatchObject({
      box: progress.box,
      dueAt: progress.dueAt,
      reviewedDay: progress.reviewedDay,
      tested: true,
    });
    expect(validateSnapshot(answered)).toBe(answered);
  });
});
