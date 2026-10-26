import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { defaultBook } from "./catalog";
const catalog = defaultBook.catalog;
const clozeLessons = defaultBook.exercises.lessons;
import { makeWordFormQuestions, validateClozePack } from "./cloze";
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
    const word = catalog.words.find((item) => item.id === source.wordId)!;
    const [q] = makeWordFormQuestions(
      [{ ...source, answer, options }],
      [
        {
          ...word,
          text: answer,
          family: options.map((text) => ({ text, pos: "", meaning: "" })),
        },
      ],
    );
    expect(q.answer).toBe(answer);
    expect(q.prompt).toBe(`${source.prompt} (${cue})`);
  });
  it("falls back to the catalog word when options contain no different family member", () => {
    const word = { ...catalog.words.find((item) => item.id === source.wordId)!, text: "agree", family: [] };
    const [q] = makeWordFormQuestions([{ ...source, options: ["agreement", "series", "used", "revolt"] }], [word]);
    expect(q.prompt).toBe(`${source.prompt} (agree)`);
  });
  it("skips a question if neither its options nor the catalog word can provide a different family cue", () => {
    const word = { ...catalog.words.find((item) => item.id === source.wordId)!, family: [] };
    expect(makeWordFormQuestions([{ ...source, options: ["agreement", "series", "used", "revolt"] }], [word])).toEqual(
      [],
    );
  });
  it.each([
    ["revolutionary", "revolt", "revolution"],
    ["efficiently", "efficacy", "efficient"],
    ["seriousness", "series", "serious"],
    ["usual", "used", "usually"],
  ])("uses a catalog family cue for %s instead of the unrelated distractor %s", (answer, wrong, cue) => {
    const questions = clozeLessons.flatMap((entry) => {
      const pack = JSON.parse(readFileSync(new URL(`../../public${entry.url}`, import.meta.url), "utf8"));
      return validateClozePack(pack, entry, catalog);
    });
    const original = questions.find((q) => q.kind === "word-form-choice" && q.answer === answer)!;
    expect(original).toBeDefined();
    expect(original.options).toContain(wrong);
    const [q] = makeWordFormQuestions([original]);
    expect(q.prompt).toBe(`${original.prompt} (${cue})`);
    expect(q.answer).toBe(answer);
  });
  it("checks all 299 sources and preserves answers for every question with a usable family cue", () => {
    let count = 0;
    const phrases: string[] = [];
    for (const entry of clozeLessons) {
      const pack = JSON.parse(readFileSync(new URL(`../../public${entry.url}`, import.meta.url), "utf8"));
      const choices = validateClozePack(pack, entry, catalog).filter((q) => q.kind === "word-form-choice");
      const typed = makeWordFormQuestions(choices);
      for (const original of choices) {
        const word = catalog.words.find((item) => item.id === original.wordId)!;
        const family = [word.text, ...word.family.map((item) => item.text)].map((text) => text.trim().toLowerCase());
        const eligible = original.options.filter(
          (option) => option !== original.answer && family.includes(option.trim().toLowerCase()),
        );
        const q = typed.find((item) => item.sourceId === original.sourceId);
        if (!eligible.length && word.text === original.answer) {
          expect(q).toBeUndefined();
          continue;
        }
        expect(q).toBeDefined();
        expect(q!.answer).toBe(original.answer);
        const cue = q!.prompt.slice(original.prompt.length + 2, -1);
        expect(family).toContain(cue.toLowerCase());
        expect(cue.toLowerCase()).not.toBe(q!.answer.toLowerCase());
        if (eligible.length) expect(cue.length).toBe(Math.min(...eligible.map((option) => option.trim().length)));
        else expect(cue).toBe(word.text);
        if (q!.answer.includes(" ")) phrases.push(q!.answer);
      }
      count += choices.length;
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
