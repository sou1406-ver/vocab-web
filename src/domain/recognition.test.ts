import { describe, expect, it } from "vitest";
import { makeRecognitionQuestions, beginExerciseSession, answerQuestion, emptySnapshot } from "./learning";
import { defaultBook } from "../data/catalog";
const catalog = defaultBook.catalog;
import { validateSnapshot } from "../data/validation";
import { makeQuestions } from "./learning";
import type { Word } from "./types";

describe("Recognition in both directions", () => {
  it("prefers safe same-lesson distractors instead of making the topic a clue", () => {
    const word = catalog.words[0];
    const target = { ...word, id: "target", text: "target", meaning: "mục tiêu", lesson: 12, synonyms: [], family: [] };
    const nearby = Array.from({ length: 5 }, (_, i) => ({
      ...word,
      id: `local-${i}`,
      text: `local-${i}`,
      meaning: `nghĩa gần ${i}`,
      lesson: 12,
      synonyms: [],
      family: [],
    }));
    const outside = Array.from({ length: 5 }, (_, i) => ({
      ...word,
      id: `far-${i}`,
      text: `far-${i}`,
      meaning: `nghĩa xa ${i}`,
      lesson: 1,
      synonyms: [],
      family: [],
    }));
    const all = [target, ...outside, ...nearby];
    const choices = makeRecognitionQuestions([target], all, "nearby");
    expect(
      choices[1].options.filter((option) => option !== target.text).every((option) => option.startsWith("local-")),
    ).toBe(true);
    const learn = makeQuestions([target], all, "learn", "nearby")[0];
    expect(
      learn.kind === "meaning" &&
        learn.options.filter((option) => option !== target.meaning).every((option) => option.startsWith("nghĩa gần")),
    ).toBe(true);
    const pools = new Set(
      Array.from({ length: 12 }, (_, i) =>
        JSON.stringify(
          makeRecognitionQuestions([target], all, `session-${i}`)[1]
            .options.filter((option) => option !== target.text)
            .sort(),
        ),
      ),
    );
    expect(pools.size).toBeGreaterThan(1);
  });
  it("only borrows tested roots beyond the current lesson", () => {
    const template = catalog.words[0];
    const make = (id: string, lesson: number): Word => ({
      ...template,
      id,
      text: id,
      meaning: id,
      lesson,
      synonyms: [],
      family: [],
    });
    const target = make("target", 12);
    const all = [target, make("local", 12), make("tested-a", 13), make("tested-b", 1), make("unseen", 13)];
    const p = {
      startedAt: 1,
      startedDay: "2026-10-31",
      box: 1,
      dueAt: 2,
      correct: 1,
      incorrect: 0,
      tested: true,
      policyVersion: 1 as const,
    };
    expect(
      new Set(makeRecognitionQuestions([target], all, "tested", { "tested-a": p, "tested-b": p })[1].options),
    ).toEqual(new Set(["target", "local", "tested-a", "tested-b"]));
  });
  it("shuffles by session ID, stays stable within a session and varies across sessions", () => {
    const words = catalog.words.slice(0, 6);
    const first = makeRecognitionQuestions(words, catalog.words, "session-a");
    expect(first).toEqual(makeRecognitionQuestions(words, catalog.words, "session-a"));
    const orders = new Set(
      Array.from({ length: 12 }, (_, i) =>
        JSON.stringify(makeRecognitionQuestions(words, catalog.words, `session-${i}`)[0].options),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
    expect(first.map((q) => q.options)).not.toEqual(
      makeRecognitionQuestions(words, catalog.words, "session-b").map((q) => q.options),
    );
  });
  it("has distinct choices across the temporary 600-word catalog", () => {
    const questions = makeRecognitionQuestions(catalog.words, catalog.words);
    expect(questions).toHaveLength(1200);
    for (const q of questions) expect(new Set(q.options).size).toBe(4);
  });
  it("makes stable questions with one correct answer in each direction", () => {
    const words = catalog.words.slice(0, 6);
    const questions = makeRecognitionQuestions(words, catalog.words);
    expect(questions).toHaveLength(12);
    expect(questions.map((q) => q.kind)).toEqual(words.flatMap(() => ["meaning", "word-choice"]));
    expect(questions).toEqual(makeRecognitionQuestions(words, catalog.words));
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((option) => option === q.answer)).toHaveLength(1);
      expect(new Set(q.options).size).toBe(4);
    }
    const state = beginExerciseSession(emptySnapshot(), catalog, questions, "Recognition", "r", 100);
    expect(validateSnapshot(state).session?.mode).toBe("practice");
    const answered = answerQuestion(state, "r", 0, questions[0].answer, false, 101);
    expect(answered.progress).toEqual({});
    expect(answered.events[0].questionKind).toBe("meaning");
  });
  it("avoids known synonyms/family and overlapping meanings as distractors", () => {
    const word = catalog.words[0];
    const all = [
      word,
      { ...word, id: "same-meaning", text: "same-meaning" },
      { ...word, id: "synonym", text: "known", meaning: "other" },
      ...catalog.words.slice(5, 15),
    ];
    const target = { ...word, synonyms: ["known"] };
    const reverse = makeRecognitionQuestions([target], all)[1];
    expect(reverse.options).not.toContain("same-meaning");
    expect(reverse.options).not.toContain("known");
    expect(() => makeRecognitionQuestions([word], [word])).toThrow();
  });
});
