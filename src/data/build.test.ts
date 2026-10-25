import { describe, expect, it } from "vitest";
import affixes from "../../data/generated/affixes.json";
import { catalog } from "./catalog";
import { makeBuildQuestions } from "./build";
import type { Word } from "../domain/types";

const groups = [
  ["-ion", "-tion", "-sion", "-ation", "-ition", "-ison"],
  ["-able", "-ible"],
  ["-er", "-or", "-itor"],
  ["-ance", "-ence", "-ancy", "-ency"],
  ["-ant", "-ent"],
  ["-al", "-ial", "-ual"],
  ["-ive", "-ative", "-itive"],
  ["-ic", "-ical", "-atic", "-tic"],
  ["-ory", "-atory", "-ary"],
  ["-ure", "-ture", "-ature"],
];
const rare = [
  "-ison",
  "-ele",
  "-s",
  "-is",
  "-se",
  "-ety",
  "-ise",
  "-ior",
  "-ite",
  "-n",
  "-ice",
  "-th",
  "-dom",
  "-ology",
  "ac-",
  "sur-",
  "a-",
  "mal-",
];
const family: Word["family"] = [{ text: "happiness", meaning: "niềm hạnh phúc", pos: "n", parts: ["happy", "-ness"] }];
const word: Word = { ...catalog.words[0], family };

describe("Build questions from catalog families", () => {
  it("uses the family meaning, part of speech, ordered parts and stable source ID", () => {
    const [q] = makeBuildQuestions([word], "session-a");
    expect(q).toMatchObject({
      kind: "build",
      wordId: word.id,
      prompt: "niềm hạnh phúc (n)",
      answer: ["happy", "-ness"],
      form: "happiness",
      sourceId: `build:${word.id}:happiness`,
      sourceVersion: catalog.version,
    });
    expect(q.tiles).toHaveLength(5);
    expect(makeBuildQuestions([word], "session-a")).toEqual([q]);
    const orders = new Set(
      Array.from({ length: 12 }, (_, index) => JSON.stringify(makeBuildQuestions([word], `s-${index}`)[0].tiles)),
    );
    expect(orders.size).toBeGreaterThan(1);
    expect(makeBuildQuestions([word], "another")[0].sourceId).toBe(q.sourceId);
  });
  it("excludes equivalent and rare distractors, supplies one prefix and two suffixes, and has unique tiles", () => {
    const before = JSON.stringify(catalog);
    const questions = makeBuildQuestions(catalog.words, "all-families");
    expect(questions.length).toBeGreaterThan(0);
    expect(new Set(questions.map((q) => q.sourceId)).size).toBe(questions.length);
    for (const q of questions) {
      const wrong = q.tiles.filter((tile) => !q.answer.includes(tile));
      expect(wrong).toHaveLength(3);
      expect(new Set(q.tiles.map((part) => part.trim().toLowerCase())).size).toBe(q.tiles.length);
      expect(wrong.filter((part) => affixes[part as keyof typeof affixes].type === "prefix")).toHaveLength(1);
      expect(wrong.filter((part) => affixes[part as keyof typeof affixes].type === "suffix")).toHaveLength(2);
      for (const tile of wrong) {
        expect(rare).not.toContain(tile);
        for (const group of groups)
          if (group.some((part) => q.answer.includes(part))) expect(group).not.toContain(tile);
      }
      const source = catalog.words
        .find((entry) => entry.id === q.wordId)!
        .family.find((entry) => entry.text === q.form)!;
      expect(q.answer).toEqual(source.parts);
    }
    expect(JSON.stringify(catalog)).toBe(before);
  });
  it("does not create duplicate forms, duplicate answer pieces, legacy or one-piece questions", () => {
    expect(
      makeBuildQuestions(
        [
          {
            ...word,
            family: [
              ...family,
              ...family,
              { text: "old", pos: "n", meaning: "cũ" },
              { text: "single", pos: "n", meaning: "một", parts: ["single"] },
              { text: "repeat", pos: "n", meaning: "lặp", parts: ["re-", "re-"] },
            ],
          },
        ],
        "s",
      ),
    ).toHaveLength(1);
    expect(makeBuildQuestions([{ ...word, family: [] }], "s")).toEqual([]);
  });
});
