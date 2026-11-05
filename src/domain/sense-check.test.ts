import { describe, expect, it } from "vitest";
import { advanceSession, answerQuestion, beginSession, beginSkillReview, emptySnapshot } from "./learning";
import { latestSenseOutcome, senseOutcome } from "./sense-check";
import { learningItems, needsLearning } from "./lexicon";
import type { Catalog, Snapshot, Word } from "./types";
import { validateSnapshot } from "../data/validation";

export const fixtureWord = (count = 3): Word => ({
  id: "charge-19",
  text: "charge",
  lesson: 19,
  pos: "v",
  ipa: "",
  meaning: "thu phí",
  definition: "ask for money",
  examples: [],
  family: [],
  synonyms: [],
  antonyms: [],
  parts: [],
  senseId: "s0",
  groupWordId: "charge-19",
  lexeme: {
    id: "en:charge",
    text: "charge",
    senses: Array.from({ length: count }, (_, i) => ({
      id: `s${i}`,
      pos: i === 1 ? "n" : "v",
      meaning: `nghĩa ${i}`,
      explanation: `Giải thích ${i}`,
      definition: `Sense ${i}`,
      examples: [{ text: `We charge for service ${i}.`, translation: `Dịch ${i}` }],
      patterns: [],
      synonyms: [],
      antonyms: [],
      status: "reviewed",
      sources: [{ kind: "editorial", reference: "fixture" }],
    })),
  },
  learningItems: Array.from({ length: count }, (_, i) => ({
    id: i ? `toeic-600:charge-19:s${i}` : "charge-19",
    senseId: `s${i}`,
  })),
});
const setup = (count = 3) => {
  const word = fixtureWord(count);
  const catalog: Catalog = { version: "new-content", words: [word], lessons: [], topics: [] };
  return beginSession(emptySnapshot(), catalog, [word], "learn", "Pilot", "check", 1000);
};
const respond = (state: Snapshot, correct: boolean) => {
  if (state.session!.phase === "learn") state = advanceSession(state, "check", state.session!.index, 1100);
  const q = state.session!.questions[state.session!.index];
  return validateSnapshot(
    answerQuestion(
      state,
      "check",
      state.session!.index,
      correct ? q.answer : "wrong",
      false,
      1200 + state.session!.index,
    ),
  );
};
const next = (state: Snapshot) => advanceSession(state, "check", state.session!.index, 1300);
describe("bounded multi-sense check", () => {
  it("ignores delayed older offline groups when choosing the latest word outcome", () => {
    let passed = respond(setup(2), true);
    passed = respond(next(passed), true);
    let failed = respond(setup(2), false);
    failed = respond(next(failed), false);
    const newer = passed.events.map((e, index) => ({ ...e, id: `new:${index}`, sessionId: "new", at: 20000 + index }));
    const older = failed.events.map((e, index) => ({ ...e, id: `old:${index}`, sessionId: "old", at: 10000 + index }));
    expect(latestSenseOutcome([...newer, ...older], "charge-19")).toBe("passed");
    expect(latestSenseOutcome([...older, ...newer], "charge-19")).toBe("passed");
  });
  it("checks every required sense once and retries only the first wrong one after all others pass", () => {
    let state = setup();
    expect(state.session!.questions).toHaveLength(3);
    state = respond(state, false);
    state = respond(next(state), true);
    state = respond(next(state), true);
    expect(state.session!.questions).toHaveLength(4);
    expect(state.session!.questions[3].senseCheck).toMatchObject({ senseId: "s0", role: "repair" });
    expect(senseOutcome(state.session!, state.events, "charge-19")).toBe("pending");
    expect(needsLearning(fixtureWord(), state)).toBe(true);
    const progress = structuredClone(state.progress);
    state = next(state);
    expect(state.session!.phase).toBe("learn");
    state = respond(state, true);
    expect(senseOutcome(state.session!, state.events, "charge-19")).toBe("passed");
    expect(needsLearning(fixtureWord(), state)).toBe(false);
    expect(state.progress).toEqual(progress);
    expect(state.events.map((e) => e.id)).toEqual(["check:0", "check:1", "check:2", "check:3"]);
    expect(state.events[0].correct).toBe(false);
    expect(state.events[3].scoringVersion).toBe(5);
  });
  it("marks the word unlearned if another sense fails, while checking each remaining sense only once", () => {
    let state = respond(setup(4), false);
    state = respond(next(state), false);
    state = respond(next(state), true);
    state = respond(next(state), true);
    expect(state.session!.questions).toHaveLength(4);
    expect(senseOutcome(state.session!, state.events, "charge-19")).toBe("unlearned");
    expect(next(state).session!.phase).toBe("complete");
  });
  it("allows only one repair, including a single-sense word, and survives JSON reload without duplicate answers", () => {
    let state = respond(setup(1), false);
    state = JSON.parse(JSON.stringify(state));
    expect(state.session!.questions).toHaveLength(2);
    expect(answerQuestion(state, "check", 0, "wrong", false)).toBe(state);
    state = respond(next(state), false);
    expect(state.session!.questions).toHaveLength(2);
    expect(senseOutcome(state.session!, state.events, "charge-19")).toBe("unlearned");
    expect(next(state).session!.phase).toBe("complete");
  });
  it("keeps practice ungrouped and never introduces lookup senses", () => {
    const word = fixtureWord();
    const result = beginSession(
      emptySnapshot(),
      { version: "v", words: [word], lessons: [], topics: [] },
      [word],
      "practice",
      "Practice",
      "p",
    );
    expect(result.session!.questions).toHaveLength(1);
    expect(result.session!.questions[0].senseCheck).toBeUndefined();
    expect(learningItems(word)).toHaveLength(3);
  });
  it("passes an all-correct group without retries and repairs a failure at any position", () => {
    let allCorrect = respond(setup(2), true);
    allCorrect = respond(next(allCorrect), true);
    expect(allCorrect.session!.questions).toHaveLength(2);
    expect(senseOutcome(allCorrect.session!, allCorrect.events, "charge-19")).toBe("passed");
    let laterError = respond(setup(), true);
    laterError = respond(next(laterError), false);
    laterError = respond(next(laterError), true);
    expect(laterError.session!.questions[3].senseCheck?.senseId).toBe("s1");
    expect(() => answerQuestion(next(laterError), "check", 2, "charge", false)).toThrow();
  });
  it("reviews introduced senses only, and diagnostic questions do not schedule an early review", () => {
    const word = fixtureWord();
    const secondary = learningItems(word)[1].id;
    const p = {
      startedAt: 1,
      startedDay: "1970-01-01",
      box: 2,
      dueAt: 500,
      correct: 2,
      incorrect: 0,
      tested: true,
      policyVersion: 1 as const,
    };
    const snapshot = {
      ...emptySnapshot(),
      progress: { [word.id]: p, [secondary]: { ...p, dueAt: 900000, groupWordId: word.id } },
    };
    let state = beginSkillReview(
      snapshot,
      { version: "v", words: [word], lessons: [], topics: [] },
      [{ word, skill: "recall" }],
      "Review",
      "check",
      1000,
    );
    expect(state.session!.questions).toHaveLength(2);
    expect(state.session!.questions[1].senseCheck?.role).toBe("diagnostic");
    state = respond(state, true);
    state = respond(next(state), true);
    expect(state.progress[secondary]).toEqual(snapshot.progress[secondary]);
    expect(state.progress[learningItems(word)[2].id]).toBeUndefined();
    expect(senseOutcome(state.session!, state.events, word.id)).toBe("unintroduced");
  });
});
