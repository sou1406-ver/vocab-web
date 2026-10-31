import { describe, expect, it } from "vitest";
import { createCatalogCloze } from "../../scripts/lib/cloze-content.mjs";
import { makeCatalogClozeQuestions } from "./cloze";
import type { ClozeChoiceQuestion, Word } from "../domain/types";

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
const prepare = (words: Word[], session = "s") =>
  makeCatalogClozeQuestions(
    createCatalogCloze(1, words).map((q) => ({ ...q, sourceVersion: "pack" })) as ClozeChoiceQuestion[],
    { version: "test", words, lessons: [], topics: [] },
    session,
  );

describe("Catalog example sources and runtime choices", () => {
  it("builds stable sources without options, even when no distractors are available", () => {
    const before = structuredClone(target);
    const raw = createCatalogCloze(1, [target]);
    expect(raw).toMatchObject([
      { sourceId: "catalog:example:agreement:0", prompt: "They reached an ________ yesterday.", options: [] },
    ]);
    expect(createCatalogCloze(1, [target])).toEqual(raw);
    expect(target).toEqual(before);
    expect(prepare([target])).toEqual([]);
  });
  it("filters related roots, reverse synonyms, normalized duplicates and untested external words", () => {
    const words = [
      target,
      ...distractors,
      makeWord("deal"),
      makeWord("agree"),
      makeWord("accord", { synonyms: ["agreement"] }),
      makeWord("duplicate", { text: " POLICY " }),
      makeWord("unseen", { lesson: 2 }),
    ];
    const [q] = prepare(words);
    expect(new Set(q.options.map((option) => option.toLowerCase()))).toEqual(
      new Set(["agreement", "policy", "receipt", "invoice"]),
    );
    expect(q.options.filter((option) => option === q.answer)).toHaveLength(1);
    expect(prepare(words)).toEqual([q]);
  });
  it("varies choices across sessions without changing the source", () => {
    const words = [
      target,
      ...["policy", "receipt", "invoice", "budget", "account", "report"].map((id) => makeWord(id)),
    ];
    const before = structuredClone(words);
    const variants = Array.from({ length: 12 }, (_, i) => prepare(words, `s-${i}`)[0]);
    expect(new Set(variants.map((q) => JSON.stringify(q.options))).size).toBeGreaterThan(1);
    expect(new Set(variants.map((q) => q.options.indexOf(q.answer))).size).toBeGreaterThan(1);
    expect(words).toEqual(before);
  });
  it("keeps distinct complete answer sets when enough local roots exist", () => {
    const words = ["agreement", "policy", "receipt", "invoice", "contract"].map((id) =>
      makeWord(id, { examples: [{ text: `The ${id} arrived.`, translation: "" }] }),
    );
    const questions = prepare(words);
    expect(questions).toHaveLength(5);
    expect(new Set(questions.map((q) => JSON.stringify([...q.options].sort()))).size).toBe(5);
    const limited = prepare(words.slice(0, 4));
    expect(limited).toHaveLength(4);
    expect(new Set(limited.map((q) => JSON.stringify([...q.options].sort()))).size).toBe(1);
  });
  it("never dips into fallback tiers merely to avoid repeating a set", () => {
    const roots = ["agreement", "policy", "receipt", "invoice"].map((id) =>
      makeWord(id, { examples: [{ text: `The ${id} arrived.`, translation: "" }] }),
    );
    const fallback = makeWord("deliver", { pos: "v", family: [{ text: "delivery", pos: "n", meaning: "giao hàng" }] });
    const questions = prepare([...roots, fallback]);
    expect(questions).toHaveLength(4);
    for (const q of questions) expect(new Set(q.options)).toEqual(new Set(roots.map((word) => word.text)));
  });
  it("keeps the original index of the first unambiguous whole-word example", () => {
    const word = {
      ...target,
      examples: ["The agreements arrived.", "An agreement needs an agreement.", "An Agreement was signed."].map(
        (text) => ({ text, translation: "" }),
      ),
    };
    expect(createCatalogCloze(1, [word])).toMatchObject([
      { sourceId: "catalog:example:agreement:2", prompt: "An ________ was signed." },
    ]);
    expect(createCatalogCloze(2, [word])).toEqual([]);
    expect(
      createCatalogCloze(1, [{ ...word, examples: [{ text: "The agreement is ___ today.", translation: "" }] }]),
    ).toEqual([]);
  });
});
