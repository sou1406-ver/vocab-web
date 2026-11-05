import { describe, expect, it } from "vitest";
import { compileLexicon, validateLexicon, learningFingerprintPayload } from "../../scripts/lib/lexicon-content.mjs";
import { learningItems, mergeReviewGroups } from "../domain/lexicon";
import type { Word } from "../domain/types";
import { distractorPool } from "../domain/distractors";

const sense = (id: string, pos = "v", status = "reviewed") => ({
  id,
  pos,
  status,
  meaning: id,
  explanation: `Giải thích ${id}`,
  definition: `Definition of ${id}`,
  examples: [{ text: `We charge a fee.`, translation: "Chúng tôi thu phí." }],
  patterns: ["charge for something"],
  synonyms: [],
  antonyms: [],
  sources: [{ kind: "editorial", reference: "Pilot authored examples" }],
});
const source = () => ({
  version: 1,
  entries: [
    {
      id: "en:charge",
      text: "charge",
      senses: [sense("ask-payment"), sense("fee", "n"), sense("battery"), sense("hidden", "v", "draft")],
    },
  ],
});
const word: Word = {
  id: "legacy-charge",
  text: "charge",
  lesson: 19,
  pos: "v/n",
  meaning: "old",
  definition: "old",
  ipa: "",
  examples: [],
  family: [],
  synonyms: [],
  antonyms: [],
  parts: [],
};
const bindings = { version: 1, items: [{ wordId: word.id, lexemeId: "en:charge", required: ["ask-payment", "fee"] }] };

describe("reviewed lexicon compiler", () => {
  it("keeps the earliest due skill ahead of supplemental meanings before shuffling review groups", () => {
    const [base] = compileLexicon([word], source(), bindings, "toeic-600");
    const items = learningItems(base);
    const due = [{ wordId: items[1].id, skill: "recall", dueAt: 10 }];
    const extra = [{ wordId: items[0].id, skill: "recognition", dueAt: 1 }];
    expect(mergeReviewGroups(due, extra, items)).toEqual({ due, extra: [] });
  });
  it("publishes reviewed senses only, keeps POS on sense and preserves the legacy primary ID", () => {
    const result = compileLexicon([word], source(), bindings, "toeic-600");
    expect(result[0].id).toBe(word.id);
    expect(result[0].pos).toBe("v");
    expect(result[0].lexeme).not.toHaveProperty("pos");
    expect(result[0].lexeme.senses.map((s: { id: string }) => s.id)).toEqual(["ask-payment", "fee", "battery"]);
    const items = learningItems(result[0]);
    expect(items.map((w) => w.id)).toEqual([word.id, "toeic-600:legacy-charge:fee"]);
    expect(items[1]).toMatchObject({ pos: "n", meaning: "fee", groupWordId: word.id });
    expect(items.every((w) => w.senseId !== "battery")).toBe(true);
    expect(learningItems(word)).toEqual([word]);
  });
  it("rejects missing, duplicate, unreviewed or source-less required senses", () => {
    for (const required of [["hidden"], ["missing"], ["fee", "fee"]])
      expect(() =>
        compileLexicon([word], source(), { ...bindings, items: [{ ...bindings.items[0], required }] }, "toeic-600"),
      ).toThrow();
    const invalid = source();
    invalid.entries[0].senses[0].sources = [];
    expect(() => validateLexicon(invalid)).toThrow();
  });
  it("validates optional core and unique stable IDs without mutating its inputs", () => {
    const original = source();
    const before = structuredClone(original);
    compileLexicon([word], original, bindings, "toeic-600");
    expect(original).toEqual(before);
    expect(() => validateLexicon({ ...original, entries: [...original.entries, ...original.entries] })).toThrow();
    expect(() => validateLexicon({ ...original, entries: [{ ...original.entries[0], core: 42 }] })).toThrow();
  });
  it("changes the learning fingerprint for required content, while ignoring lookup-only or draft editorial changes", () => {
    const compile = (s: ReturnType<typeof source>) =>
      learningFingerprintPayload({ words: compileLexicon([word], s, bindings, "toeic-600"), lessons: [], topics: [] });
    const baseline = compile(source());
    const lookup = source();
    lookup.entries[0].senses[2].meaning = "new lookup meaning";
    lookup.entries[0].senses[3].meaning = "new draft meaning";
    expect(compile(lookup)).toEqual(baseline);
    const changed = source();
    changed.entries[0].senses[1].meaning = "new required meaning";
    expect(compile(changed)).not.toEqual(baseline);
  });
  it("never uses another sense, POS or book item of the target lexeme as a distractor", () => {
    const [base] = compileLexicon([word], source(), bindings, "toeic-600");
    const [target, otherSense] = learningItems(base);
    const otherBook = { ...otherSense, id: "another-book:charge", text: "CHARGE" };
    const unrelated = { ...word, id: "customer-19", text: "customer", meaning: "khách hàng" };
    expect(distractorPool(target, [target, otherSense, otherBook, unrelated], {}, "test").map((w) => w.id)).toEqual([
      unrelated.id,
    ]);
  });
});
