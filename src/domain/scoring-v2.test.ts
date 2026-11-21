import { describe, expect, it } from "vitest";
import { defaultBook } from "../data/catalog";
const catalog = defaultBook.catalog;
import { validateSnapshot } from "../data/validation";
import { studyHintOffers } from "./study-hints";
import { studyWords } from "./lexicon";
import {
  emptySnapshot,
  beginSession,
  answerQuestion,
  revealQuestionLetter,
  applyStudyHint,
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
      scoringVersion: 6,
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
      scoringVersion: 6,
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
    delete legacy.events[0].hintKinds;
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

describe("Study hints", () => {
  it("keeps the first semantic cue free and charges a second cue of a different kind", () => {
    const original = review("agreement");
    const one = applyStudyHint(original, "s", 0, { kind: "example", value: "They signed the ___." });
    expect(one.session!.hints).toEqual([{ kind: "example", value: "They signed the ___." }]);
    expect(answerQuestion(one, "s", 0, "agreement", false, 1001).events[0]).toMatchObject({
      correct: true,
      assisted: false,
      scoringVersion: 6,
      hintKinds: ["example"],
    });
    const two = applyStudyHint(one, "s", 0, { kind: "definition", value: "A shared decision." });
    expect(answerQuestion(two, "s", 0, "agreement", false, 1001).events[0]).toMatchObject({
      correct: false,
      assisted: true,
      scoringVersion: 6,
      hintKinds: ["example", "definition"],
    });
  });

  it("blocks a suffix revealing more new letters than the remaining allowance", () => {
    const original = review("agreement");
    expect(applyStudyHint(original, "s", 0, { kind: "suffix", value: [5, 6, 7, 8] })).toBe(original);
  });

  it("charges a confirmed pronunciation and restores the used example through snapshot validation", () => {
    const one = applyStudyHint(review("agreement"), "s", 0, { kind: "example", value: "We reached an ___." });
    const two = applyStudyHint(one, "s", 0, { kind: "pronunciation" });
    const restored = validateSnapshot(JSON.parse(JSON.stringify(two)));
    expect(restored.session!.hints).toEqual([
      { kind: "example", value: "We reached an ___." },
      { kind: "pronunciation" },
    ]);
    expect(answerQuestion(restored, "s", 0, "agreement", false, 1001).events[0]).toMatchObject({
      correct: false,
      assisted: true,
      hintKinds: ["example", "pronunciation"],
    });
  });

  it("takes distinct semantic cues from the current reviewed sense", () => {
    const original = review("agreement");
    const word = {
      ...catalog.words[0],
      id: "test:item",
      text: "agreement",
      definition: "Legacy definition",
      examples: [{ text: "Ignore this agreement example.", translation: "" }],
      synonyms: ["legacy synonym"],
      learningItems: [{ id: "test:item:settlement", senseId: "settlement" }],
      lexeme: {
        id: "test:agreement",
        text: "agreement",
        senses: [
          {
            id: "settlement",
            status: "reviewed" as const,
            pos: "noun",
            meaning: "sự dàn xếp",
            explanation: "",
            definition: "A decision accepted by both sides.",
            examples: [
              { text: "They signed the agreement.", translation: "" },
              { text: "The agreement settled the dispute.", translation: "" },
            ],
            synonyms: [" AgReEmEnT ", "settlement"],
            patterns: [],
            antonyms: [],
            sources: [],
          },
          {
            id: "draft",
            status: "draft" as const,
            pos: "noun",
            meaning: "nghĩa nháp",
            explanation: "",
            definition: "Draft definition",
            examples: [{ text: "The agreement had a draft example.", translation: "" }],
            synonyms: ["draft synonym"],
            patterns: [],
            antonyms: [],
            sources: [],
          },
        ],
      },
    };
    const [item] = studyWords([word]);
    original.session!.questions[0] = {
      kind: "cloze",
      wordId: item.id,
      prompt: "They signed the __________.",
      answer: "agreement",
    };
    expect(studyHintOffers(original.session!, item, [item], false).slice(0, 3)).toEqual([
      { hint: { kind: "example", value: "The ___ settled the dispute." }, price: "free" },
      { hint: { kind: "definition", value: "A decision accepted by both sides." }, price: "free" },
      { hint: { kind: "synonym", value: "settlement" }, price: "free" },
    ]);
    expect(
      studyHintOffers(original.session!, { ...item, senseId: "draft" }, [item], false).map(({ hint }) => hint.kind),
    ).toEqual(["letter"]);
    const reviewed = item.lexeme!.senses[0];
    const sparse = {
      ...item,
      lexeme: {
        ...item.lexeme!,
        senses: [
          {
            ...reviewed,
            definition: "",
            examples: [{ text: "They used a preexisting blank ___.", translation: "" }],
            synonyms: [" AgReEmEnT "],
          },
        ],
      },
    };
    expect(studyHintOffers(original.session!, sparse, [sparse], false).map(({ hint }) => hint.kind)).toEqual([
      "letter",
    ]);
    original.session!.questions[0] = { ...original.session!.questions[0], kind: "word-form", answer: "agreeable" };
    expect(studyHintOffers(original.session!, item, [item], false).map(({ hint }) => hint.kind)).toEqual(["letter"]);
  });

  it("counts only new affix letters against an existing reveal budget", () => {
    const original = review("ab-cdefghij");
    original.session!.revealed = [0];
    const word = { ...catalog.words[0], text: "ab-cdefghij", parts: ["ab-", "cdefghij"] };
    const prefix = studyHintOffers(original.session!, word, [word], false).find(({ hint }) => hint.kind === "prefix")!;
    expect(prefix).toEqual({ hint: { kind: "prefix", value: [0, 1] }, price: "letter" });
    const afterPrefix = applyStudyHint(original, "s", 0, prefix.hint, prefix.price);
    expect(afterPrefix.session!.revealed).toEqual([0, 1]);
    const afterLetter = revealQuestionLetter(afterPrefix, "s", 0);
    const answered = answerQuestion(afterLetter, "s", 0, "ab-cdefghij", false, 1001);
    expect(answered.events[0]).toMatchObject({
      hintKinds: ["prefix", "letter"],
      hintCount: 3,
      hintLimit: 3,
      assisted: false,
      correct: true,
    });
  });

  it("shows an unavailable suffix with zero cost or exposure", () => {
    const original = review("agreement");
    const word = { ...catalog.words[0], text: "agreement", parts: ["agree", "-ment"] };
    const suffix = studyHintOffers(original.session!, word, [word], false).find(({ hint }) => hint.kind === "suffix")!;
    expect(suffix.blocked).toBe(true);
    expect(applyStudyHint(original, "s", 0, suffix.hint, suffix.price)).toBe(original);
  });

  it("eliminates exactly two wrong choices, persists them and does not answer using a removed choice", () => {
    const original = review("agreement");
    const question = {
      kind: "word-choice" as const,
      wordId: catalog.words[0].id,
      prompt: "sự đồng ý",
      answer: "agreement",
      options: ["agreement", "agreement form", "party", "cancellation"],
    };
    original.session!.questions[0] = question;
    const offer = studyHintOffers(original.session!, catalog.words[0], [], true)[0];
    expect(offer.price).toBe("assisted");
    if (offer.hint.kind !== "eliminate") throw new Error("Expected elimination");
    expect(new Set(offer.hint.value).size).toBe(2);
    expect(offer.hint.value).not.toContain(question.answer);
    const used = applyStudyHint(original, "s", 0, offer.hint);
    const restored = validateSnapshot(JSON.parse(JSON.stringify(used)));
    expect(restored.session!.questions[0]).toEqual(question);
    expect(restored.session!.hints).toEqual([offer.hint]);
    expect(answerQuestion(restored, "s", 0, offer.hint.value[0], false, 1001)).toBe(restored);
    expect(answerQuestion(restored, "s", 0, question.answer, false, 1001).events[0]).toMatchObject({
      correct: false,
      assisted: true,
      hintKinds: ["eliminate"],
      hintCount: 0,
      hintLimit: 0,
    });
  });

  it("rejects restored affixes that exceed the shared letter allowance", () => {
    const snapshot = review("agreement");
    snapshot.session!.revealed = [5, 6, 7, 8];
    snapshot.session!.peeked = false;
    expect(validateSnapshot(JSON.parse(JSON.stringify(snapshot))).session!.revealed).toEqual([5, 6, 7, 8]);
    snapshot.session!.hints = [{ kind: "suffix", value: [5, 6, 7, 8] }];
    expect(() => validateSnapshot(JSON.parse(JSON.stringify(snapshot)))).toThrow();
  });

  it("rejects a restored affix that uses a legacy letter's remaining budget", () => {
    const snapshot = review("agreement");
    snapshot.session!.revealed = [2, 7, 8];
    snapshot.session!.hints = [{ kind: "suffix", value: [7, 8] }];
    expect(() => validateSnapshot(JSON.parse(JSON.stringify(snapshot)))).toThrow();
  });

  it("rejects restored recorded letters that expose the entire answer", () => {
    const snapshot = review("ab");
    snapshot.session!.revealed = [0, 1];
    snapshot.session!.peeked = true;
    snapshot.session!.hints = [{ kind: "letter", value: 1 }];
    expect(() => validateSnapshot(JSON.parse(JSON.stringify(snapshot)))).toThrow();
  });

  it("restores recorded letters and affixes in order alongside older revealed letters", () => {
    const original = review("abcdefghij");
    original.session!.revealed = [0];
    const afterLetter = revealQuestionLetter(original, "s", 0);
    const afterAffix = applyStudyHint(afterLetter, "s", 0, { kind: "prefix", value: [0, 1] });
    expect(afterAffix.session!.hints?.map(({ kind }) => kind)).toEqual(["letter", "prefix"]);
    const restored = validateSnapshot(JSON.parse(JSON.stringify(afterAffix)));
    expect(restored.session!.revealed).toEqual(afterAffix.session!.revealed);
    expect(restored.session!.hints).toEqual(afterAffix.session!.hints);
  });

  it("rejects malformed current cues and malformed event kinds", () => {
    const original = review("agreement");
    const used = applyStudyHint(original, "s", 0, { kind: "example", value: "We reached an ___." });
    for (const hints of [
      [{ kind: "other", value: "We reached an ___." }],
      [{ kind: "example", value: "We reached an agreement." }],
      [{ kind: "example", value: 0 }],
      [{ kind: "letter", value: 99 }],
      [{ kind: "prefix", value: [0, 1] }],
      [{ kind: "pronunciation", value: "agreement" }],
    ]) {
      expect(() => validateSnapshot({ ...used, session: { ...used.session!, hints } })).toThrow();
    }
    const answered = answerQuestion(used, "s", 0, "agreement", false, 1001);
    for (const hintKinds of [undefined, ["unknown"], ["example", "example"], ["eliminate"], ["example", "synonym"]]) {
      expect(() => validateSnapshot({ ...answered, events: [{ ...answered.events[0], hintKinds }] })).toThrow();
    }
  });
});
