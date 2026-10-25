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
const lessons = [
  { id: 1, topicId: "business" },
  { id: 2, topicId: "business" },
  { id: 3, topicId: "travel" },
  { id: 4, topicId: "business" },
];

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
    const questions = createCatalogCloze(1, words, lessons);
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
    expect(createCatalogCloze(1, words, lessons)).toEqual(questions);
  });
  it("skips a word when fewer than three eligible distractors exist", () => {
    expect(createCatalogCloze(1, [target, ...distractors.slice(0, 2), makeWord("deal")])).toEqual([]);
  });
  it("fills missing distractors from same-topic lessons after exhausting same-lesson choices", () => {
    const words = [
      target,
      makeWord("outside-topic", { lesson: 3 }),
      makeWord("unmapped-lesson", { lesson: 5 }),
      makeWord("deal", { lesson: 2 }),
      makeWord("accord", { lesson: 2, synonyms: ["agreement"] }),
      makeWord("agree", { lesson: 2 }),
      makeWord("arrangement", { lesson: 2, family: [{ text: "agreement", pos: "n", meaning: "" }] }),
      makeWord("promise", { lesson: 2, pos: "v" }),
      makeWord("receipt", { lesson: 2, pos: "N." }),
      makeWord("duplicate-receipt", { lesson: 4, text: "RECEIPT" }),
      makeWord("invoice", {
        lesson: 4,
        examples: [{ text: "The invoice arrived.", translation: "" }],
      }),
      distractors[0],
    ];
    const questions = createCatalogCloze(1, words, lessons);
    expect(questions).toMatchObject([
      { wordId: target.id, answer: "agreement", options: ["agreement", "policy", "receipt", "invoice"] },
    ]);
    expect(questions).toHaveLength(1);
    expect(createCatalogCloze(1, words, lessons)).toEqual(questions);
  });
  it("does not borrow from other topics or duplicate options when the topic still has too few choices", () => {
    const words = [
      target,
      distractors[0],
      makeWord("receipt", { lesson: 2 }),
      makeWord("duplicate-receipt", { lesson: 4, text: " RECEIPT " }),
      makeWord("invoice", { lesson: 3 }),
    ];
    expect(createCatalogCloze(1, words, lessons)).toEqual([]);
    expect(
      createCatalogCloze(
        1,
        words,
        lessons.filter((lesson) => lesson.id !== 1),
      ),
    ).toEqual([]);
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
