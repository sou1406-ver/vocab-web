import { describe, expect, it } from "vitest";
import { makeListeningQuestions, LISTEN_PROMPTS } from "./listening";
import { defaultBook } from "./catalog";
const catalog = defaultBook.catalog;
import type { Catalog, Word } from "../domain/types";
const word = (text: string, lesson = 1): Word => ({
  id: text,
  text,
  lesson,
  pos: "v",
  meaning: text,
  ipa: "",
  definition: "",
  examples: [],
  family: [],
  synonyms: [],
  antonyms: [],
  parts: [],
});
const root = {
  ...word("engage"),
  family: ["engagement", "engaged", "engaging", " ENGAGE "].map((text) => ({ text, pos: "v", meaning: "" })),
};
const source: Catalog = {
  version: "test",
  topics: [],
  lessons: [
    { id: 1, title: "", translation: "", topicId: "one" },
    { id: 2, title: "", translation: "", topicId: "one" },
    { id: 3, title: "", translation: "", topicId: "two" },
  ],
  words: [root, word("employ"), word("enroll"), word("require"), word("abandon", 3), word("visit", 3)],
};
describe("Listening questions", () => {
  it("uses lesson roots before distinct family forms with exactly one normalized correct choice", () => {
    for (let n = 0; n < 12; n++) {
      const [q] = makeListeningQuestions(
        [root],
        { ...source, words: [root, word("employ"), word("unseen", 2)] },
        "listen-choice",
        `s-${n}`,
      );
      if (q.kind !== "listen-choice") throw new Error("choice");
      expect(q.options).toContain("employ");
      expect(q.options.filter((option) => root.family.some((form) => form.text === option))).toHaveLength(2);
      expect(q.options.filter((option) => option.trim().toLowerCase() === q.answer)).toHaveLength(1);
      expect(q.prompt).toBe(LISTEN_PROMPTS[q.kind]);
      expect(q.prompt.toLowerCase()).not.toContain(root.text);
    }
  });
  it("prefers nearby same-initial or similar-length words after family and seeds all options", () => {
    const target = { ...root, family: [] };
    const pool = { ...source, words: [target, ...source.words.slice(1), { ...word("duplicate"), text: " EMPLOY " }] };
    const [q] = makeListeningQuestions([target], pool, "listen-choice", "s");
    if (q.kind !== "listen-choice") throw new Error("choice");
    expect(new Set(q.options.map((option) => option.trim().toLowerCase()))).toEqual(
      new Set(["engage", "employ", "enroll", "require"]),
    );
    expect(makeListeningQuestions([target], pool, "listen-choice", "s")[0]).toEqual(q);
    expect(
      new Set(
        Array.from({ length: 16 }, (_, n) =>
          JSON.stringify(makeListeningQuestions([target], pool, "listen-choice", `s-${n}`)[0].options),
        ),
      ).size,
    ).toBeGreaterThan(1);
  });
  it("keeps typed prompts generic and leaves catalog content unchanged", () => {
    const before = JSON.stringify(catalog);
    for (const kind of ["listen-choice", "listen-type"] as const) {
      const questions = makeListeningQuestions(catalog.words, catalog, kind, "catalog");
      expect(questions).toHaveLength(catalog.words.length);
      for (const q of questions) {
        expect(q.prompt).toBe(LISTEN_PROMPTS[kind]);
        expect(q.answer).toBe(catalog.words.find((word) => word.id === q.wordId)!.text);
        if (q.kind === "listen-choice") {
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options.map((option) => option.trim().toLowerCase().replace(/\s+/g, " "))).size).toBe(4);
          expect(q.options).toContain(q.answer);
        } else expect(q.options ?? []).toEqual([]);
      }
    }
    expect(JSON.stringify(catalog)).toBe(before);
  });
});
