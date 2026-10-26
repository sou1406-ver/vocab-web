import { describe, expect, it } from "vitest";
import { defaultBook } from "../data/catalog";
const catalog = defaultBook.catalog;
import { makeListeningQuestions } from "../data/listening";
import { validateSnapshot } from "../data/validation";
import { answerQuestion, beginExerciseSession, emptySnapshot, hintAllowance, revealQuestionLetter } from "./learning";

const start = (kind: "listen-choice" | "listen-type" = "listen-type") =>
  beginExerciseSession(
    emptySnapshot(),
    catalog,
    makeListeningQuestions(
      [catalog.words.find((w) => w.text.replace(/[^a-z]/gi, "").length >= 6)!],
      catalog,
      kind,
      "s",
    ),
    "Listen",
    "s",
    100,
  );
describe("Listening practice", () => {
  it.each(["listen-choice", "listen-type"] as const)(
    "scores %s with old string scoring, practice and stable event IDs",
    (kind) => {
      const state = start(kind);
      const q = state.session!.questions[0];
      const result = answerQuestion(state, "s", 0, q.answer, false, 101);
      expect(result.events[0]).toMatchObject({
        id: "s:0",
        questionKind: kind,
        correct: true,
        assisted: false,
        scoringVersion: 2,
      });
      expect(result.progress).toEqual({});
      expect(validateSnapshot(result)).toBe(result);
    },
  );
  it("uses the 30% hint limit, persists revealed letters and marks only excess hints as assisted", () => {
    let state = start();
    const answer = state.session!.questions[0].answer as string;
    const limit = hintAllowance(answer);
    for (let n = 0; n < limit; n++) state = revealQuestionLetter(state, "s", 0);
    state = validateSnapshot(JSON.parse(JSON.stringify(state)));
    expect(answerQuestion(state, "s", 0, answer, false).events[0]).toMatchObject({
      correct: true,
      assisted: false,
      hintCount: limit,
      hintLimit: limit,
    });
    state = revealQuestionLetter(state, "s", 0);
    expect(answerQuestion(state, "s", 0, answer, false).events[0]).toMatchObject({
      correct: false,
      assisted: true,
      hintCount: limit + 1,
      hintLimit: limit,
    });
    expect(() => revealQuestionLetter(start("listen-choice"), "s", 0)).toThrow();
  });
  it("accepts old schema-2 sessions and optional source metadata but rejects leaked or invalid listening prompts/options", () => {
    expect(validateSnapshot(emptySnapshot()).schemaVersion).toBe(2);
    const old = beginExerciseSession(
      emptySnapshot(),
      catalog,
      [{ kind: "recall", wordId: catalog.words[0].id, prompt: "nghĩa", answer: "word" }],
      "Old",
      "old",
      100,
    );
    expect(validateSnapshot(old)).toBe(old);
    const compatible = start();
    Object.assign(compatible.session!.questions[0], { sourceId: undefined, sourceVersion: undefined });
    expect(validateSnapshot(compatible)).toBe(compatible);
    for (const patch of [{ prompt: "engage" }, { options: ["wrong"] }]) {
      const bad = start();
      Object.assign(bad.session!.questions[0], patch);
      expect(() => validateSnapshot(bad)).toThrow();
    }
    const duplicate = start("listen-choice");
    const q = duplicate.session!.questions[0];
    if (q.kind !== "listen-choice") throw new Error("choice");
    q.options[1] = ` ${q.answer.toUpperCase()} `;
    expect(() => validateSnapshot(duplicate)).toThrow();
    for (const mode of ["learn", "review"] as const) {
      const bad = start();
      bad.session!.mode = mode;
      expect(() => validateSnapshot(bad)).toThrow();
      expect(() => answerQuestion(bad, "s", 0, bad.session!.questions[0].answer, false)).toThrow();
    }
  });
  it("keeps existing review scheduling unchanged and applies zero hints for three-letter answers", () => {
    const state = start();
    const q = state.session!.questions[0];
    state.progress[q.wordId] = {
      startedAt: 1,
      startedDay: "2026-10-25",
      box: 5,
      dueAt: 2,
      reviewedDay: "2026-10-25",
      correct: 2,
      incorrect: 1,
      tested: true,
      policyVersion: 1,
    };
    const answered = answerQuestion(state, "s", 0, q.answer, false, 101);
    expect(answered.progress[q.wordId]).toMatchObject({ box: 5, dueAt: 2, reviewedDay: "2026-10-25" });
    Object.assign(state.session!.questions[0], { answer: "cat" });
    const hinted = revealQuestionLetter(state, "s", 0);
    expect(answerQuestion(hinted, "s", 0, "cat", false, 102).events[0]).toMatchObject({
      hintLimit: 0,
      hintCount: 1,
      assisted: true,
      correct: false,
    });
  });
});
