import { describe, expect, it } from "vitest";
import { makeSynonymQuestions } from "./synonyms";
import { catalog } from "./catalog";
import type { Word } from "../domain/types";

const word = (text: string, patch: Partial<Word> = {}): Word => ({
  id: text,
  text,
  lesson: 1,
  pos: "v",
  meaning: text,
  ipa: "",
  definition: "",
  examples: [],
  family: [],
  parts: [],
  synonyms: [],
  antonyms: [],
  ...patch,
});
const target = word("engage", {
  synonyms: ["participate", "occupy"],
  antonyms: ["disengage"],
  family: [{ text: "engagement", pos: "n", meaning: "" }],
  examples: [{ text: "They Engage in discussions.", translation: "" }],
});
const all = [
  target,
  word("participate"),
  word("disengage"),
  word("engagement"),
  word("involve", { synonyms: ["engage"] }),
  word("join", { synonyms: ["participate"] }),
  word("bridge", { synonyms: ["involve", "join"] }),
  word("measure", { synonyms: ["gauge"] }),
  word("inspect", { synonyms: ["examine"] }),
  word("deliver", { synonyms: ["bring"] }),
  word("duplicate", { text: " DELIVER " }),
  word("capacity", { pos: "n", synonyms: ["volume"] }),
];

describe("Synonym question generation", () => {
  it.each(["synonym-choice", "synonym-context"] as const)(
    "makes %s with one valid answer and no known related distractors",
    (kind) => {
      const before = JSON.stringify(all);
      for (let index = 0; index < 24; index++) {
        const [q] = makeSynonymQuestions([target], all, kind, `s-${index}`);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options.map((option) => option.trim().toLowerCase())).size).toBe(4);
        const correct = q.direction === "antonym" ? target.antonyms : target.synonyms;
        expect(correct).toContain(q.answer);
        expect(q.options.filter((option) => correct.includes(option))).toEqual([q.answer]);
        for (const option of q.options.filter((option) => option !== q.answer)) {
          expect([
            "engage",
            "participate",
            "occupy",
            "disengage",
            "engagement",
            "involve",
            "join",
            "capacity",
            "volume",
          ]).not.toContain(option.toLowerCase());
        }
      }
      expect(JSON.stringify(all)).toBe(before);
    },
  );
  it("uses seeded answers/options and asks antonyms approximately one third of eligible sessions with a visible label", () => {
    const first = makeSynonymQuestions([target], all, "synonym-choice", "same");
    expect(makeSynonymQuestions([target], all, "synonym-choice", "same")).toEqual(first);
    const questions = Array.from(
      { length: 180 },
      (_, index) => makeSynonymQuestions([target], all, "synonym-choice", `seed-${index}`)[0],
    );
    const opposite = questions.filter((q) => q.direction === "antonym");
    expect(opposite.length).toBeGreaterThan(40);
    expect(opposite.length).toBeLessThan(80);
    for (const q of opposite) expect(q.prompt).toBe("TRÁI NGHĨA: engage");
    expect(new Set(questions.map((q) => JSON.stringify(q.options))).size).toBeGreaterThan(1);
    expect(new Set(questions.filter((q) => q.direction === "synonym").map((q) => q.answer)).size).toBe(2);
    const noAntonym = { ...target, antonyms: [] };
    for (let index = 0; index < 12; index++)
      expect(makeSynonymQuestions([noAntonym], all, "synonym-choice", `s-${index}`)[0].direction).toBe("synonym");
  });
  it("keeps the first example with one exact whole-word match, without substituting the synonym or making a blank", () => {
    const source = {
      ...target,
      examples: ["They disengage.", "They engage and engage.", "They Engage in discussions."].map((text) => ({
        text,
        translation: "",
      })),
    };
    const [q] = makeSynonymQuestions([source], all, "synonym-context", "s");
    expect(q.prompt).toBe("They Engage in discussions.");
    expect(q.target).toBe("engage");
    expect(q.sourceId).toBe("synonym-context:engage:2");
    expect(q.direction).toBe("synonym");
    expect(q.prompt).not.toContain("___");
    expect(
      makeSynonymQuestions([{ ...source, examples: source.examples.slice(0, 2) }], all, "synonym-context", "s"),
    ).toEqual([]);
    expect(
      makeSynonymQuestions(
        [{ ...source, examples: [{ text: "They engage in ___.", translation: "" }] }],
        all,
        "synonym-context",
        "s",
      ),
    ).toEqual([]);
  });
  it("skips ambiguous, empty or insufficient pools and normalizes split relationship lists", () => {
    expect(makeSynonymQuestions([target], [target, word("inspect")], "synonym-choice", "s")).toEqual([]);
    expect(
      makeSynonymQuestions([{ ...target, synonyms: ["engage"], antonyms: [] }], all, "synonym-choice", "s"),
    ).toEqual([]);
    const split = { ...target, synonyms: [" participate ; OCCUPY ", "PARTICIPATE"], antonyms: ["occupy"] };
    const [q] = makeSynonymQuestions([split], all, "synonym-context", "s");
    expect(q.answer).toBe("participate");
    expect(q.options.map((option) => option.toLowerCase())).not.toContain("occupy");
  });
  it("filters the complete catalog without changing its content or allowing known reverse/overlapping relations", () => {
    const before = JSON.stringify(catalog);
    const terms = (values: string[]) =>
      values
        .flatMap((value) => value.split(/[;,]/))
        .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
        .filter(Boolean);
    for (const kind of ["synonym-choice", "synonym-context"] as const) {
      const questions = makeSynonymQuestions(catalog.words, catalog.words, kind, "whole-catalog");
      expect(questions.length).toBeGreaterThan(0);
      for (const q of questions) {
        const root = catalog.words.find((item) => item.id === q.wordId)!;
        const synonyms = terms(root.synonyms);
        const forbidden = [
          root.text.toLowerCase(),
          ...synonyms,
          ...terms(root.antonyms),
          ...terms(root.family.map((item) => item.text)),
        ];
        const valid = q.direction === "antonym" ? terms(root.antonyms) : synonyms;
        expect(q.options.filter((option) => valid.includes(option.toLowerCase()))).toEqual([q.answer]);
        for (const option of q.options.filter((option) => option !== q.answer)) {
          expect(forbidden).not.toContain(option.toLowerCase());
          for (const owner of catalog.words.filter(
            (item) =>
              item.text.toLowerCase() === option.toLowerCase() || terms(item.synonyms).includes(option.toLowerCase()),
          )) {
            expect(terms(owner.synonyms)).not.toContain(root.text.toLowerCase());
            expect(terms(owner.synonyms).some((term) => synonyms.includes(term))).toBe(false);
          }
        }
      }
    }
    expect(JSON.stringify(catalog)).toBe(before);
  });
});
