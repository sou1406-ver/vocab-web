import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { validateSnapshot } from "./validation";
import { advanceSession, answerQuestion, beginSession, emptySnapshot } from "../domain/learning";
import { makeQuestions } from "../domain/learning";

const at = Date.parse("2026-10-25T06:00:00Z");
function active() {
  return advanceSession(
    beginSession(emptySnapshot(), catalog, catalog.words.slice(0, 3), "learn", "Test", "s", at),
    "s",
    0,
    at,
  );
}

describe("Learning contract compatibility", () => {
  it("keeps the schema-2 text-question wire format readable by already-open clients", () => {
    const questions = makeQuestions(catalog.words.slice(0, 12), catalog.words, "learn");
    for (const q of questions) {
      if (q.kind !== "meaning") expect(JSON.parse(JSON.stringify(q)).options).toEqual([]);
    }
  });
  it("records question context for each new answer and does not duplicate it", () => {
    for (const kind of ["meaning", "cloze", "recall"] as const) {
      const state = active();
      const base = { wordId: catalog.words[0].id, prompt: "test", answer: "answer" };
      state.session!.questions[0] =
        kind === "meaning" ? { ...base, kind, options: ["answer", "other"] } : { ...base, kind };
      const answered = answerQuestion(state, "s", 0, "answer", false, at);
      expect(answered.events[0]).toMatchObject({
        questionKind: kind,
        questionId: "s:0",
        contentVersion: catalog.version,
        skill: "vocabulary",
        scoringVersion: 1,
      });
      expect(validateSnapshot(answered)).toBe(answered);
      expect(answerQuestion(answered, "s", 0, "answer", false, at).events).toHaveLength(1);
    }
  });
  it("reads legacy sessions with empty options and keeps legacy event metadata unknown", () => {
    const state = JSON.parse(JSON.stringify(active()));
    state.session.questions[0] = {
      wordId: catalog.words[0].id,
      kind: "recall",
      prompt: "test",
      answer: "answer",
      options: [],
    };
    state.events = [
      {
        id: "old:0",
        sessionId: "old",
        wordId: catalog.words[0].id,
        at,
        day: "2026-10-25",
        correct: true,
        assisted: false,
        mode: "learn",
      },
    ];
    expect(validateSnapshot(state)).toBe(state);
    const answered = answerQuestion(validateSnapshot(state), "s", 0, "answer", false, at);
    expect(answered.events[0]).toEqual(state.events[0]);
    expect(answered.events[0]).not.toHaveProperty("questionKind");
    expect(answered.events[1]).toHaveProperty("questionKind", "recall");
  });
  it("accepts typed questions without options and rejects inconsistent payloads", () => {
    const state = JSON.parse(JSON.stringify(active()));
    state.session.questions[0] = { wordId: catalog.words[0].id, kind: "cloze", prompt: "test", answer: "answer" };
    expect(() => validateSnapshot(state)).not.toThrow();
    state.session.questions[0].options = ["unexpected"];
    expect(() => validateSnapshot(state)).toThrow();
    state.session.questions[0].kind = "listening";
    expect(() => validateSnapshot(state)).toThrow();
  });
  it.each([
    ["questionKind", "invented"],
    ["questionId", ""],
    ["contentVersion", 42],
    ["skill", "listening"],
    ["scoringVersion", 2],
  ])("rejects invalid event metadata %s", (key, value) => {
    const state = JSON.parse(JSON.stringify(answerQuestion(active(), "s", 0, "wrong", false, at)));
    state.events[0][key] = value;
    expect(() => validateSnapshot(state)).toThrow();
  });
});
