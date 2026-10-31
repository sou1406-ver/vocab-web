import { describe, expect, it } from "vitest";
import { emptySnapshot, makeQuestions, makeRecognitionQuestions } from "../domain/learning";
import { makeSynonymQuestions } from "./synonyms";
import { makeListeningQuestions } from "./listening";
import { makeCatalogClozeQuestions } from "./cloze";
import type { Catalog, ClozeChoiceQuestion, Word } from "../domain/types";

const word = (id: string, lesson = 1, pos = "n"): Word => ({
  id,
  text: id,
  lesson,
  pos,
  ipa: "",
  meaning: `nghĩa ${id}`,
  definition: "",
  examples: [],
  synonyms: [],
  antonyms: [],
  family: [],
  parts: [],
});
const target = {
  ...word("target"),
  synonyms: ["equivalent"],
  examples: [{ text: "The target arrived today.", translation: "" }],
};
const local = [
  word("local-a"),
  word("local-b", 1, "v"),
  { ...word("local-c", 1, "v"), family: [{ text: "local-family", pos: "n", meaning: "dạng từ trong bài" }] },
];
const unknown = [word("unseen-a", 2), word("unseen-b", 2), word("unseen-c", 3)];
const catalog: Catalog = {
  version: "test",
  words: [target, ...unknown, ...local],
  topics: [],
  lessons: [
    { id: 1, title: "", translation: "", topicId: "same" },
    { id: 2, title: "", translation: "", topicId: "same" },
    { id: 3, title: "", translation: "", topicId: "other" },
  ],
};
const q: ClozeChoiceQuestion = {
  kind: "cloze-choice",
  wordId: target.id,
  prompt: "The ________ arrived today.",
  answer: target.text,
  options: [],
  sourceId: "catalog:example:target:0",
  sourceVersion: "pack",
};
const allowedWords = new Set([
  target.text,
  ...local.flatMap((entry) => [entry.text, ...entry.family.map((form) => form.text)]),
]);

describe("Distractors follow actual studied vocabulary", () => {
  it("with empty progress all distractors stay inside this lesson or its family forms", () => {
    for (const id of ["one", "two", "three"]) {
      const english = [
        makeRecognitionQuestions([target], catalog.words, id, {})[1],
        ...makeSynonymQuestions([target], catalog.words, "synonym-choice", id, {}),
        ...makeSynonymQuestions([target], catalog.words, "synonym-context", id, {}),
        ...makeListeningQuestions([target], catalog, "listen-choice", id, {}),
        ...makeCatalogClozeQuestions([q], catalog, id, {}),
      ];
      expect(english.length).toBe(5);
      for (const question of english) {
        const options = question.options ?? [];
        expect(options).toHaveLength(4);
        expect(options.filter((option) => option === question.answer)).toHaveLength(1);
        for (const option of options.filter((option) => option !== question.answer))
          expect(allowedWords.has(option)).toBe(true);
      }
      const meanings = new Set(
        [target, ...local].flatMap((entry) => [entry.meaning, ...entry.family.map((form) => form.meaning)]),
      );
      const learned = makeQuestions([target], catalog.words, "learn", id, {})[0];
      expect(learned.kind).toBe("meaning");
      if (learned.kind === "meaning") for (const option of learned.options) expect(meanings.has(option)).toBe(true);
    }
  });
  it("uses tested words in another lesson, never merely introduced words or unlearned same-topic words", () => {
    const p = {
      startedAt: 1,
      startedDay: "2026-10-31",
      box: 1,
      dueAt: 2,
      correct: 1,
      incorrect: 0,
      tested: true,
      policyVersion: 1 as const,
    };
    const progress = { "unseen-a": p, "unseen-b": { ...p, tested: false } };
    const choices = makeRecognitionQuestions([target], catalog.words, "tested", progress)[1];
    expect(choices.options).toContain("unseen-a");
    expect(choices.options).not.toContain("unseen-b");
    expect(choices.options).not.toContain("unseen-c");
    const catalogChoice = makeCatalogClozeQuestions([q], catalog, "tested", progress)[0];
    expect(catalogChoice.options).toContain("unseen-a");
  });
  it("prefers lesson roots with another POS before family fallback and never changes progress", () => {
    const progress = emptySnapshot().progress;
    const before = structuredClone(progress);
    const [question] = makeListeningQuestions([target], catalog, "listen-choice", "fallback", progress);
    expect(new Set(question.options)).toEqual(new Set([target.text, ...local.map((entry) => entry.text)]));
    expect(progress).toEqual(before);
  });
});
