import { describe, expect, it } from "vitest";
import { makeRecognitionQuestions, beginExerciseSession, answerQuestion, emptySnapshot } from "./learning";
import { defaultBook } from "../data/catalog";
const catalog = defaultBook.catalog;
import { validateSnapshot } from "../data/validation";

describe("Recognition in both directions", () => {
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
