import { describe, expect, it } from "vitest";
import { defaultBook } from "../data/catalog";
const catalog = defaultBook.catalog;
import { makeMatchQuestions } from "../data/match";
import { validateSnapshot } from "../data/validation";
import { answerMatchPair } from "./match";
import { advanceSession, answerQuestion, beginExerciseSession, emptySnapshot, finishSession } from "./learning";

function start() {
  const questions = makeMatchQuestions(catalog, catalog.topics[0].id, {}, "s");
  return beginExerciseSession(emptySnapshot(), catalog, questions, "Match", "s", 100);
}
describe("Match practice contracts", () => {
  it("saves wrong attempts before resolution and grades each pair once, independently and out of order", () => {
    let state = start();
    const wrong = answerMatchPair(state, "s", 0, 4, 3, 101);
    expect(wrong.events).toEqual([]);
    expect(wrong.session!.matchMistakes).toEqual([4]);
    expect(wrong.session!.phase).toBe("question");
    expect(answerMatchPair(wrong, "s", 0, 4, 3, 101)).toBe(wrong);
    expect(advanceSession(wrong, "s", 0, 101)).toBe(wrong);
    state = validateSnapshot(JSON.parse(JSON.stringify(wrong)));
    state = answerMatchPair(state, "s", 0, 4, 4, 102);
    expect(state.events[0]).toMatchObject({
      id: "s:4",
      questionId: "s:4",
      correct: false,
      assisted: false,
      scoringVersion: 4,
      questionKind: "match",
      mode: "practice",
      hintCount: 0,
      hintLimit: 0,
    });
    expect(answerMatchPair(state, "s", 0, 4, 4, 103)).toBe(state);
    // Selecting a locked meaning must neither score nor mark the other word wrong.
    expect(answerMatchPair(state, "s", 0, 1, 4, 103)).toBe(state);
    for (const index of [2, 0, 5, 3]) state = answerMatchPair(state, "s", 0, index, index, 104);
    expect(state.session!.phase).toBe("question");
    state = answerMatchPair(state, "s", 0, 1, 1, 105);
    expect(state.session!.phase).toBe("feedback");
    expect(new Set(state.events.map((e) => e.id))).toEqual(new Set(["s:0", "s:1", "s:2", "s:3", "s:4", "s:5"]));
    expect(state.events.filter((e) => e.correct)).toHaveLength(5);
    expect(validateSnapshot(state)).toBe(state);
    const done = advanceSession(state, "s", 0, 106);
    expect(done.session!.phase).toBe("complete");
    expect(done.history[0]).toMatchObject({ correct: 5, total: 6, finished: true });
  });
  it("advances by complete boards and rejects cross-group choices", () => {
    let state = start();
    const second = state.session!.questions.map((q) => ({ ...q, groupId: "second" }));
    state.session!.questions.push(...second);
    expect(validateSnapshot(state)).toBe(state);
    expect(() => answerMatchPair(state, "s", 0, 0, 6)).toThrow();
    for (let index = 0; index < 6; index++) state = answerMatchPair(state, "s", 0, index, index, 101);
    state = advanceSession(state, "s", 0, 102);
    expect(state.session).toMatchObject({ index: 6, phase: "question" });
    expect(validateSnapshot(state)).toBe(state);
    for (let index = 6; index < 12; index++) state = answerMatchPair(state, "s", 6, index, index, 103);
    state = advanceSession(state, "s", 6, 104);
    expect(state.history[0]).toMatchObject({ total: 12, correct: 12, finished: true });
  });
  it("leaves all progress and scheduling unchanged, including unlearned words", () => {
    let state = start();
    const id = state.session!.questions[0].wordId;
    state.progress[id] = {
      startedAt: 1,
      startedDay: "2026-10-25",
      box: 5,
      dueAt: 2,
      reviewedDay: "2026-10-25",
      correct: 10,
      incorrect: 2,
      tested: true,
      policyVersion: 1,
    };
    const before = structuredClone(state.progress);
    for (let index = 0; index < 6; index++) state = answerMatchPair(state, "s", 0, index, index, 101);
    expect(state.progress).toEqual(before);
  });
  it("rejects stale, invalid and non-practice actions and prevents generic grading from bypassing Match", () => {
    const state = start();
    expect(() => answerMatchPair(state, "other", 0, 0, 0)).toThrow();
    expect(() => answerMatchPair(state, "s", 1, 0, 0)).toThrow();
    for (const index of [-1, 6, 1.5]) expect(() => answerMatchPair(state, "s", 0, index, 0)).toThrow();
    expect(() => answerQuestion(state, "s", 0, state.session!.questions[0].answer, false)).toThrow();
    for (const mode of ["learn", "review"] as const) {
      const invalid = structuredClone(state);
      invalid.session!.mode = mode;
      expect(() => answerMatchPair(invalid, "s", 0, 0, 0)).toThrow();
      expect(() => validateSnapshot(invalid)).toThrow();
    }
  });
  it("keeps completed pair events when ending a board early", () => {
    let state = answerMatchPair(start(), "s", 0, 2, 2, 101);
    state = finishSession(state, false, 102);
    expect(state.history[0]).toMatchObject({ total: 1, correct: 1, finished: false });
    expect(validateSnapshot(state)).toBe(state);
  });
  it("accepts old schema-2 snapshots and optional Match metadata, rejecting malformed boards and mistakes", () => {
    const old = emptySnapshot();
    expect(validateSnapshot(old)).toBe(old);
    expect(old.session).toBeNull();
    const oldChoice = beginExerciseSession(
      old,
      catalog,
      [{ kind: "meaning", wordId: catalog.words[0].id, prompt: "word", answer: "nghĩa", options: ["nghĩa", "khác"] }],
      "Old",
      "old",
      100,
    );
    expect(validateSnapshot(oldChoice)).toBe(oldChoice);
    const compatible = start();
    for (const q of compatible.session!.questions) {
      if (q.kind !== "match") throw new Error("Expected Match");
      delete q.groupId;
      delete q.sourceId;
      delete q.sourceVersion;
    }
    expect(validateSnapshot(compatible)).toBe(compatible);
    for (const patch of [
      { matchMistakes: [-1] },
      { matchMistakes: [6] },
      { matchMistakes: [1, 1] },
      { matchMistakes: ["1"] },
      { index: 1 },
    ]) {
      const bad = start();
      Object.assign(bad.session!, patch);
      expect(() => validateSnapshot(bad)).toThrow();
    }
    const partial = start();
    partial.session!.questions.pop();
    expect(() => validateSnapshot(partial)).toThrow();
    const separate = start();
    Object.assign(separate.session!.questions[2], { groupId: "different" });
    expect(() => validateSnapshot(separate)).toThrow();
    const scored = answerMatchPair(start(), "s", 0, 0, 0, 101);
    for (const patch of [
      { scoringVersion: 2 },
      { assisted: true, correct: true },
      { wordId: "different" },
      { id: "s:01" },
    ]) {
      const bad = structuredClone(scored);
      Object.assign(bad.events[0], patch);
      expect(() => validateSnapshot(bad)).toThrow();
    }
  });
});
