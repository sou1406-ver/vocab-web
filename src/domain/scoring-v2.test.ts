import { describe, expect, it } from "vitest";
import { defaultBook } from "../data/catalog";
const catalog = defaultBook.catalog;
import { validateSnapshot } from "../data/validation";
import {
  emptySnapshot,
  beginSession,
  answerQuestion,
  revealQuestionLetter,
  hintAllowance,
  nextHintPosition,
} from "./learning";

function review(answer: string) {
  const word = { ...catalog.words[0], text: answer };
  const state = emptySnapshot();
  state.progress[word.id] = {
    startedAt: 1,
    startedDay: "2026-10-24",
    box: 3,
    dueAt: 2,
    correct: 4,
    incorrect: 0,
    tested: true,
    policyVersion: 1,
  };
  const next = beginSession(state, { ...catalog, words: [word] }, [word], "review", "Review", "s", 1000);
  next.session!.questions = [{ kind: "recall", wordId: word.id, prompt: "meaning", answer, options: [] }];
  return next;
}

describe("Scoring version 2 hints", () => {
  it("keeps seeded hint order through reload, varies with session and leaves one letter hidden", () => {
    const sequence = (id: string, reload: boolean) => {
      let state = review("agreement");
      state.session!.id = id;
      for (let count = 0; count < 20; count++) {
        const next = nextHintPosition(state.session!, 0);
        const updated = revealQuestionLetter(state, id, 0);
        if (count < 8) expect(updated.session!.revealed!.at(-1)).toBe(next);
        state = reload ? validateSnapshot(JSON.parse(JSON.stringify(updated))) : updated;
      }
      expect(nextHintPosition(state.session!, 0)).toBe(-1);
      expect(state.session!.revealed).toHaveLength(8);
      expect(state.session!.revealed![0]).not.toBe(0);
      return state.session!.revealed;
    };
    expect(sequence("hint-one", true)).toEqual(sequence("hint-one", false));
    expect(sequence("hint-two", true)).not.toEqual(sequence("hint-one", true));
  });
  it("keeps old revealed arrays, respects letter positions and refuses the final reveal", () => {
    for (const answer of ["a", "ab", "cat", "é---猫", "agreement"]) {
      let state = review(answer);
      const letters = Array.from(answer).flatMap((char, index) => (/\p{L}/u.test(char) ? [index] : []));
      state.session!.revealed = letters.slice(0, -1);
      expect(nextHintPosition(state.session!, 0)).toBe(-1);
      expect(revealQuestionLetter(state, "s", 0)).toBe(state);
      state.session!.revealed = letters;
      state = validateSnapshot(JSON.parse(JSON.stringify(state)));
      expect(revealQuestionLetter(state, "s", 0)).toBe(state);
      expect(state.session!.revealed).toEqual(letters);
    }
  });
  it.each(["recall", "cloze", "word-form", "listen-type"] as const)("uses the same hint policy for %s", (kind) => {
    const state = review("agreement");
    state.session!.questions[0] = {
      kind,
      wordId: catalog.words[0].id,
      prompt: "________",
      answer: "agreement",
      options: [],
    };
    const next = nextHintPosition(state.session!);
    expect(next).toBeGreaterThan(0);
    expect(revealQuestionLetter(state, "s", 0).session!.revealed).toEqual([next]);
    state.session!.questions[0] = {
      kind: "meaning",
      wordId: catalog.words[0].id,
      prompt: "agreement",
      answer: "meaning",
      options: ["meaning"],
    };
    expect(nextHintPosition(state.session!)).toBe(-1);
  });
  it.each([
    ["cat", 0],
    ["apple", 1],
    ["abcdefghij", 3],
  ])("promotes review with hints at the limit for %s", (text, limit) => {
    let state = review(text as string);
    for (let index = 0; index < (limit as number); index++) state = revealQuestionLetter(state, "s", 0);
    const answered = answerQuestion(state, "s", 0, text as string, false, 1001);
    expect(answered.events[0]).toMatchObject({
      hintCount: limit,
      hintLimit: limit,
      scoringVersion: 2,
      correct: true,
      assisted: false,
    });
    expect(answered.progress[catalog.words[0].id].box).toBe(4);
  });
  it.each([
    ["cat", 0],
    ["apple", 1],
    ["abcdefghij", 3],
  ])("uses the exact 30 percent limit for %s", (text, limit) => {
    expect(hintAllowance(text as string)).toBe(limit);
    let state = review(text as string);
    for (let count = 1; count <= (limit as number) + 1; count++) {
      state = revealQuestionLetter(state, "s", 0);
      expect(Boolean(state.session!.peeked)).toBe(count > (limit as number));
      expect(validateSnapshot(JSON.parse(JSON.stringify(state))).session!.revealed).toHaveLength(count);
    }
    const answered = answerQuestion(state, "s", 0, text as string, false, 1001);
    expect(answered.events[0]).toMatchObject({
      scoringVersion: 2,
      hintCount: (limit as number) + 1,
      hintLimit: limit,
      assisted: true,
      correct: false,
    });
  });
  it("counts letters, not spaces/punctuation, and preserves review promotion within the limit", () => {
    expect(hintAllowance("ab-cd ef")).toBe(1);
    let state = revealQuestionLetter(review("apple"), "s", 0);
    const answered = answerQuestion(state, "s", 0, "apple", false, 1001);
    expect(answered.events[0]).toMatchObject({ hintCount: 1, hintLimit: 1, assisted: false, correct: true });
    expect(answered.progress[catalog.words[0].id].box).toBe(4);
    state = { ...state, session: { ...state.session!, peeked: true } };
    expect(answerQuestion(state, "s", 0, "apple", false, 1001).events[0].assisted).toBe(true);
  });
  it("reads historical v1 events, validates v2 hint counts and does not rewrite history", () => {
    const answered = answerQuestion(review("apple"), "s", 0, "apple", false, 1001);
    const legacy = JSON.parse(JSON.stringify(answered));
    legacy.events[0].scoringVersion = 1;
    delete legacy.events[0].hintCount;
    delete legacy.events[0].hintLimit;
    expect(validateSnapshot(legacy)).toBe(legacy);
    expect(() => validateSnapshot(answered)).not.toThrow();
    for (const patch of [
      { hintCount: -1 },
      { hintCount: 1.5 },
      { hintLimit: -1 },
      { sourceVersion: "" },
      { scoringVersion: 3 },
      { hintCount: undefined },
    ]) {
      const bad = structuredClone(answered);
      Object.assign(bad.events[0], patch);
      expect(() => validateSnapshot(bad)).toThrow();
    }
  });
});
