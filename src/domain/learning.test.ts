import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import {
  advanceSession,
  answerQuestion,
  beginSession,
  dayKey,
  dueIds,
  emptySnapshot,
  finishSession,
  introducedToday,
  makeQuestions,
  nextDue,
} from "./learning";
import type { Snapshot } from "./types";

const at = Date.parse("2026-10-24T06:00:00Z");
const words = catalog.words.slice(0, 5);
function newQuestion() {
  const started = beginSession(emptySnapshot(), catalog, words, "learn", "Bài 1", "one", at);
  return advanceSession(started, "one", 0, at);
}
describe("Learning policy", () => {
  it("counts only words actually introduced, preserves feedback, and rejects stale actions", () => {
    let state = newQuestion();
    expect(introducedToday(state, at)).toBe(1);
    state = answerQuestion(state, "one", 0, state.session!.questions[0].answer, false, at);
    const reload = JSON.parse(JSON.stringify(state)) as Snapshot;
    expect(reload.session!.phase).toBe("feedback");
    expect(reload.progress[words[0].id].box).toBe(1);
    expect(reload.progress[words[0].id].dueAt).toBe(Date.parse("2026-10-24T17:00:00Z"));
    expect(answerQuestion(reload, "one", 0, "wrong", false, at)).toEqual(reload);
    state = advanceSession(state, "one", 0, at);
    expect(introducedToday(state, at)).toBe(2);
    expect(() => answerQuestion(state, "one", 0, "wrong", false, at)).toThrow("thay đổi");
  });
  it("never credits exposed answers as independent recall", () => {
    const state = newQuestion();
    state.session!.peeked = true;
    const answered = answerQuestion(state, "one", 0, state.session!.questions[0].answer, false, at);
    expect(answered.events[0]).toMatchObject({ correct: false, assisted: true });
  });
  it("reviews once per day, with practice separate from scheduling", () => {
    let state = newQuestion();
    state = answerQuestion(state, "one", 0, state.session!.questions[0].answer, false, at);
    state = finishSession(state, false, at);
    const tomorrow = Date.parse("2026-10-25T06:00:00Z");
    state = beginSession(state, catalog, [words[0]], "review", "Review", "two", tomorrow);
    state = answerQuestion(state, "two", 0, state.session!.questions[0].answer, false, tomorrow);
    expect(state.progress[words[0].id].box).toBe(2);
    const due = state.progress[words[0].id].dueAt;
    state = finishSession(state, true, tomorrow);
    state = beginSession(state, catalog, [words[0]], "practice", "Practice", "three", tomorrow);
    state = answerQuestion(state, "three", 0, "wrong", false, tomorrow);
    expect(state.progress[words[0].id]).toMatchObject({ box: 2, dueAt: due, incorrect: 1 });
    expect(dueIds(state, tomorrow)).not.toContain(words[0].id);
  });
  it("keeps the full overdue backlog visible beyond a 20-word batch", () => {
    const state = emptySnapshot();
    for (const word of catalog.words.slice(0, 43))
      state.progress[word.id] = {
        startedAt: at,
        startedDay: "2026-10-23",
        box: 1,
        dueAt: at - 1,
        correct: 0,
        incorrect: 0,
        tested: true,
        policyVersion: 1,
      };
    expect(dueIds(state, at)).toHaveLength(43);
  });
  it("does not introduce words or invent a review schedule during practice", () => {
    let state = beginSession(emptySnapshot(), catalog, [words[0]], "practice", "Practice", "p", at);
    state = answerQuestion(state, "p", 0, state.session!.questions[0].answer, false, at);
    expect(state.progress).toEqual({});
    expect(state.events).toHaveLength(1);
  });
  it("computes local calendar days and DST correctly without depending on OS time", () => {
    expect(dayKey(Date.parse("2026-10-24T18:00:00Z"))).toBe("2026-10-25");
    expect(nextDue(Date.parse("2026-03-08T06:00:00Z"), 1, "America/New_York")).toBe(Date.parse("2026-03-09T04:00:00Z"));
  });
  it("retains partial work and records a completed summary exactly once", () => {
    let state = newQuestion();
    state = answerQuestion(state, "one", 0, "wrong", false, at);
    state = finishSession(state, false, at);
    expect(state.history[0]).toMatchObject({ finished: false, total: 1, correct: 0 });
    expect(finishSession(state, false, at).history).toHaveLength(1);
  });
});
describe("Content and question coverage", () => {
  it("has 600 unique words and 50 complete lessons", () => {
    expect(new Set(catalog.words.map((w) => w.id)).size).toBe(600);
    expect(catalog.lessons).toHaveLength(50);
    for (const lesson of catalog.lessons) expect(catalog.words.filter((w) => w.lesson === lesson.id)).toHaveLength(12);
  });
  it("all generated choice answers are present once and cloze answers are actually removed", () => {
    for (const question of makeQuestions(catalog.words, catalog.words, "learn")) {
      if (question.kind === "meaning") {
        expect(question.options).toHaveLength(4);
        expect(question.options.filter((o) => o === question.answer)).toHaveLength(1);
        expect(new Set(question.options).size).toBe(4);
      } else if (question.kind === "cloze") {
        expect(question.prompt).toContain("________");
        expect(question.prompt.toLowerCase()).not.toContain(question.answer.toLowerCase());
      }
    }
  });
});
