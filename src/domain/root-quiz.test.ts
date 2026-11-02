import { describe, expect, it } from "vitest";
import { roots } from "../data/roots";
import { makeRootQuiz } from "./root-quiz";

describe("root quiz", () => {
  it("builds up to five well-formed questions for every root", () => {
    for (const root of roots) {
      const quiz = makeRootQuiz(root, roots);
      expect(quiz.length).toBe(Math.min(5, root.words.length));
      for (const question of quiz) {
        expect(question.options).toContain(question.answer);
        expect(new Set(question.options).size).toBe(question.options.length);
        expect(question.options.length).toBe(4);
      }
    }
  });
  it("alternates directions and is stable for a seed", () => {
    const root = roots.find((item) => item.id === "rupt")!;
    const quiz = makeRootQuiz(root, roots);
    expect(quiz.map((question) => question.kind)).toEqual(["meaning", "word", "meaning", "word", "meaning"]);
    expect(makeRootQuiz(root, roots)).toEqual(quiz);
    expect(makeRootQuiz(root, roots, "rupt:again")).not.toEqual(quiz);
  });
  it("asks words of this root and prefers this root's words as distractors", () => {
    const root = roots.find((item) => item.id === "tract")!;
    const texts = root.words.map((word) => word.text);
    const quiz = makeRootQuiz(root, roots);
    const wordQuestion = quiz.find((question) => question.kind === "word")!;
    expect(wordQuestion.options.every((option) => texts.includes(option))).toBe(true);
  });
});
