import { describe, expect, it } from "vitest";
import { createCatalogCloze } from "../../scripts/lib/cloze-content.mjs";
import type { Word } from "../domain/types";

const makeWord = (id: string, patch: Partial<Word> = {}): Word => ({
  id,
  lesson: 1,
  text: id,
  pos: "n",
  ipa: "",
  meaning: id,
  definition: "",
  examples: [],
  family: [],
  synonyms: [],
  antonyms: [],
  parts: [],
  ...patch,
});
const target = makeWord("agreement", {
  examples: [{ text: "They reached an agreement yesterday.", translation: "" }],
  family: [{ text: "agree", pos: "v", meaning: "đồng ý" }],
  synonyms: ["deal"],
});
const distractors = [makeWord("policy"), makeWord("receipt"), makeWord("invoice")];

describe("Catalog example cloze choices", () => {
  it("uses three distinct same-lesson, same-pos distractors after excluding related words both ways", () => {
    const words = [
      target,
      makeWord("deal"),
      makeWord("accord", { synonyms: ["agreement"] }),
      makeWord("agree"),
      makeWord("arrangement", { family: [{ text: "agreement", pos: "n", meaning: "" }] }),
      makeWord("outside", { lesson: 2 }),
      makeWord("promise", { pos: "v" }),
      distractors[0],
      makeWord("duplicate-policy", { text: "POLICY" }),
      ...distractors.slice(1),
    ];
    const questions = createCatalogCloze(1, words);
    expect(questions).toEqual([
      {
        kind: "cloze-choice",
        sourceId: "catalog:example:agreement:0",
        wordId: "agreement",
        prompt: "They reached an ________ yesterday.",
        answer: "agreement",
        options: ["agreement", "policy", "receipt", "invoice"],
      },
    ]);
    expect(createCatalogCloze(1, words)).toEqual(questions);
  });
  it("skips a word when fewer than three eligible distractors exist", () => {
    expect(createCatalogCloze(1, [target, ...distractors.slice(0, 2), makeWord("deal")])).toEqual([]);
  });
  it("uses the first example with one whole-word match and keeps its original index", () => {
    const word = {
      ...target,
      examples: [
        "The agreements arrived.",
        "An agreement needs an agreement.",
        "An Agreement was signed.",
        "They reached an agreement.",
      ].map((text) => ({ text, translation: "" })),
    };
    expect(createCatalogCloze(1, [word, ...distractors])).toMatchObject([
      { sourceId: "catalog:example:agreement:2", prompt: "An ________ was signed.", answer: "agreement" },
    ]);
    expect(createCatalogCloze(2, [word, ...distractors])).toEqual([]);
  });
  it("does not create a second blank in an example that is already incomplete", () => {
    const word = { ...target, examples: [{ text: "The agreement is ___ today.", translation: "" }] };
    expect(createCatalogCloze(1, [word, ...distractors])).toEqual([]);
  });
});
