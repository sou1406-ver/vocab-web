import { beginSession, emptySnapshot } from "../domain/learning";
import { isWord, validateSnapshot } from "./validation";
import { makeSynonymQuestions } from "./synonyms";
import { createCatalogCloze } from "../../scripts/lib/cloze-content.mjs";
import { defaultBook } from "./catalog";
import pilot from "../../content/lexicon/pilot.json";
import pilotBindings from "../../content/books/toeic-600/senses.json";
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

const canonicalSense = (id: string, rank = "primary", status = "reviewed") => ({
  id,
  rank,
  status,
  pos: "n",
  meaningVi: id,
  explanationVi: "giải thích",
  definitionEn: "definition",
  examples: [{ en: "a charge", vi: "một khoản phí" }],
  patterns: [],
  synonyms: ["fee"],
  antonyms: [],
  sources: [{ kind: "dictionary", reference: "https://dictionary.cambridge.org/dictionary/english/charge" }],
});
const canonical = () => ({
  version: 2,
  entries: [
    {
      id: "en:charge",
      text: "charge",
      ipa: { us: "US", uk: "UK" },
      forms: [],
      family: [],
      senses: [
        canonicalSense("main"),
        { ...canonicalSense("fee", "secondary"), ipa: { us: "fee-US", uk: "fee-UK" } },
        canonicalSense("lookup", "secondary"),
        canonicalSense("hidden", "primary", "draft"),
      ],
    },
  ],
});
const selection = { version: 2, items: [{ wordId: word.id, entryId: "en:charge", taught: ["fee"] }] };
describe("canonical progressive compilation", () => {
  it("projects the first taught meaning and schedules other reviewed primary meanings only", () => {
    const [published] = compileLexicon([word], canonical(), selection, "toeic-600");
    expect(learningItems(published).map((w) => [w.id, w.meaning, w.ipa])).toEqual([
      [word.id, "fee", "fee-US"],
      ["toeic-600:legacy-charge:main", "main", "US"],
    ]);
    expect(published.lexeme.senses.map((s: { id: string }) => s.id)).toEqual(["main", "fee", "lookup"]);
    expect(published.examples).toEqual([{ text: "a charge", translation: "một khoản phí" }]);
  });
  it("keeps every flat field while a taught sense or all primaries await review", () => {
    for (const index of [0, 1]) {
      const source = canonical();
      source.entries[0].senses[index].status = "draft";
      expect(compileLexicon([word], source, selection, "toeic-600")[0]).toBe(word);
    }
  });
  it("rejects missing taught IDs and reviewed fields while allowing incomplete drafts", () => {
    const input = canonical();
    input.entries[0].senses[3].examples = [];
    expect(() => validateLexicon(input)).not.toThrow();
    input.entries[0].senses[0].synonyms = [];
    expect(() => validateLexicon(input)).toThrow(/synonyms/i);
    expect(() =>
      compileLexicon(
        [word],
        canonical(),
        { ...selection, items: [{ ...selection.items[0], taught: ["absent"] }] },
        "toeic-600",
      ),
    ).toThrow(/absent/);
  });
});

it("generates synonym and cloze exercises from each required pilot meaning", () => {
  const words: Word[] = compileLexicon(defaultBook.catalog.words, pilot, pilotBindings, "toeic-600");
  const target = words.find((w) => w.id === "charge-19")!;
  const fee = learningItems(target).find((w) => w.senseId === "fee")!;
  const questions = makeSynonymQuestions([target], words, "synonym-context", "pilot");
  const q = questions.find((q) => q.wordId === fee.id);
  expect(q).toBeDefined();
  expect(fee.synonyms).toContain(q!.answer);
  expect(fee.examples.some((e) => e.text === q!.prompt)).toBe(true);
  expect(createCatalogCloze(19, [target]).map((q) => q.wordId)).toContain(fee.id);
});

it.each([
  ["abide by", "en:abide by"],
  ["record", "en:record~2"],
])("validates projected snapshot words for %s", (text, id) => {
  const input = canonical();
  Object.assign(input.entries[0], { text, id });
  const [published] = compileLexicon(
    [{ ...word, text }],
    input,
    { version: 2, items: [{ ...selection.items[0], entryId: id }] },
    "toeic-600",
  );
  expect(isWord(published)).toBe(true);
});
it("checks IPA, roots, duplicate IDs, reviewed definitions and explicit empty synonym lists", () => {
  const input = canonical();
  const entry = input.entries[0];
  const reviewed = entry.senses[0];
  const validate = (patch: object) => validateLexicon({ version: 2, entries: [{ ...entry, ...patch }] });
  expect(() => validate({ ipa: { us: "", uk: "UK" } })).toThrow(/IPA/);
  expect(() => validate({ rootIds: ["unknown"] })).toThrow(/rootIds/);
  expect(() => validateLexicon({ version: 2, entries: [entry, entry] })).toThrow(/duplicate/);
  expect(() => validate({ senses: [reviewed, reviewed] })).toThrow(/duplicate/);
  for (const field of ["meaningVi", "explanationVi", "definitionEn", "examples"]) {
    expect(() => validate({ senses: [{ ...reviewed, [field]: undefined }] })).toThrow(field);
  }
  expect(() => validate({ senses: [{ ...reviewed, synonyms: [], noSynonyms: true }] })).not.toThrow();
});

it("keeps required senses within the persisted session limit while allowing additional lookup senses", () => {
  const input = canonical();
  const entry = input.entries[0];
  entry.senses = Array.from({ length: 16 }, (_, i) => canonicalSense("required-" + i));
  entry.senses.push(canonicalSense("lookup", "secondary"));
  const bindings = { version: 2, items: [{ wordId: word.id, entryId: entry.id, taught: ["required-0"] }] };
  const compile = () => compileLexicon([word], input, bindings, "toeic-600");
  const words = compile();
  const snapshot = beginSession(
    emptySnapshot(),
    { version: "v2", words, lessons: [], topics: [] },
    words,
    "learn",
    "Pilot",
    "check",
    1000,
  );
  expect(validateSnapshot(snapshot)).toBe(snapshot);
  expect(isWord(words[0])).toBe(true);
  entry.senses.push(canonicalSense("overflow"));
  expect(compile).toThrow(/16 required/i);
});
it("rejects canonical and composed IDs exceeding snapshot bounds", () => {
  const input = canonical();
  const entry = input.entries[0];
  expect(() =>
    validateLexicon({ version: 2, entries: [{ ...entry, text: "x".repeat(498), id: "en:" + "x".repeat(498) }] }),
  ).toThrow(/500/);
  expect(() =>
    validateLexicon({ version: 2, entries: [{ ...entry, senses: [canonicalSense("s".repeat(501))] }] }),
  ).toThrow(/500/);
  const bookId = "b".repeat(501);
  expect(() => compileLexicon([word], input, selection, bookId)).toThrow(/500/);
});
