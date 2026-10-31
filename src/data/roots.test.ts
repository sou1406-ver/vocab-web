import { describe, expect, it } from "vitest";
import source from "../../content/roots/roots.json";
import { validateRootsContent } from "../../scripts/lib/roots-content.mjs";
import { defaultBook } from "./catalog";
import { findWordRoots } from "./roots";
import { analyseWordParts } from "./word-parts";

const ids = new Set(defaultBook.catalog.words.map((word) => word.id));

describe("Optional root content", () => {
  it("validates the nineteen supplied roots without adding expansion words to the catalog", () => {
    const before = JSON.stringify(defaultBook.catalog);
    expect(validateRootsContent(source, ids).roots).toHaveLength(19);
    expect(JSON.stringify(defaultBook.catalog)).toBe(before);
  });
  it("rejects repeated root IDs, missing affixes and unknown book word IDs including family links", () => {
    const duplicate = structuredClone(source);
    duplicate.roots[1].id = duplicate.roots[0].id;
    expect(() => validateRootsContent(duplicate, ids)).toThrow(/Duplicate root/);
    const missing = structuredClone(source);
    missing.roots[0].words[0].parts.push({ text: "-missing", role: "suffix" });
    expect(() => validateRootsContent(missing, ids)).toThrow(/Unknown affix/);
    const word = structuredClone(source);
    Object.assign(word.roots[0].words[0], { book: { wordId: "not-in-a-book" } });
    expect(() => validateRootsContent(word, ids)).toThrow(/Unknown book word/);
    const family = structuredClone(source);
    Object.assign(family.roots[0].words[1].family[0], { book: { wordId: "missing-family" } });
    expect(() => validateRootsContent(family, ids)).toThrow(/Unknown book word/);
  });
  it("finds roots through either the headword or its family with whole-word matching", () => {
    const base = defaultBook.catalog.words[0];
    expect(findWordRoots({ ...base, text: "temporary", family: [] }).map((match) => match.root.id)).toContain("tempor");
    expect(
      findWordRoots({ ...base, text: "host", family: [{ text: "temporary", pos: "adj", meaning: "" }] }).map(
        (match) => match.root.id,
      ),
    ).toContain("tempor");
    expect(findWordRoots({ ...base, text: "temporaryish", family: [] })).toEqual([]);
  });
  it("always supports basic parts from catalog family data without root explanations", () => {
    const base = defaultBook.catalog.words[0];
    const [form] = analyseWordParts({
      ...base,
      family: [{ text: "unhelpful", pos: "adj", meaning: "", parts: ["un-", "help", "-ful"] }],
    });
    expect(form.parts.map((part) => part.role)).toEqual(["prefix", "stem", "suffix"]);
    expect(form.parts[0].meaning).toBeTruthy();
    expect(form.parts[1].meaning).toBe("");
    expect(analyseWordParts({ ...base, family: [{ text: "help", pos: "v", meaning: "", parts: ["help"] }] })).toEqual(
      [],
    );
  });
});
