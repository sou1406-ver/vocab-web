import { describe, expect, it } from "vitest";
import source from "../../content/roots/roots.json";
import { validateRootsContent } from "../../scripts/lib/roots-content.mjs";
import { defaultBook } from "./catalog";
import { findSenseMaps, findWordRoots, rootOfPart } from "./roots";
import { analyseWordParts } from "./word-parts";

const ids = new Set(defaultBook.catalog.words.map((word) => word.id));

describe("Optional root content", () => {
  it("validates the supplied roots, prefix families and particles without adding expansion words to the catalog", () => {
    const before = JSON.stringify(defaultBook.catalog);
    const content = validateRootsContent(source, ids);
    expect(content.roots.map((root) => root.id)).toEqual(expect.arrayContaining(["tempor", "rupt", "spect"]));
    expect(content.prefixFamilies?.map((family) => family.affix)).toEqual(expect.arrayContaining(["pre-", "sub-"]));
    expect(content.particles?.map((particle) => particle.word)).toEqual(expect.arrayContaining(["on", "in", "by"]));
    const pairOf = (word: string) => content.particles?.find((particle) => particle.word === word)?.pair;
    expect([pairOf("in"), pairOf("on"), pairOf("across"), pairOf("through")]).toEqual([
      "on",
      "in",
      "through",
      "across",
    ]);
    expect(content.coreWords?.map((word) => word.word)).toEqual(expect.arrayContaining(["rule", "interest"]));
    expect(JSON.stringify(defaultBook.catalog)).toBe(before);
  });
  it("still accepts content without prefix families or particles", () => {
    const { prefixFamilies, particles, coreWords, ...older } = structuredClone(source);
    void prefixFamilies;
    void particles;
    void coreWords;
    expect(validateRootsContent(older, ids).roots).toHaveLength(source.roots.length);
  });
  it("rejects prefix families with unknown affixes and particles without senses", () => {
    const family = structuredClone(source);
    family.prefixFamilies[0].affix = "zz-";
    expect(() => validateRootsContent(family, ids)).toThrow(/Invalid prefix family/);
    const familyWord = structuredClone(source);
    familyWord.prefixFamilies[0].words[0].parts.push({ text: "-missing", role: "suffix" });
    expect(() => validateRootsContent(familyWord, ids)).toThrow(/Unknown affix/);
    const particle = structuredClone(source);
    particle.particles[0].senses = [];
    expect(() => validateRootsContent(particle, ids)).toThrow(/Invalid particles: /);
    const core = structuredClone(source);
    core.coreWords[1].word = core.coreWords[0].word;
    expect(() => validateRootsContent(core, ids)).toThrow(/Duplicate coreWords: /);
    const pair = structuredClone(source);
    Object.assign(pair.particles.find((item) => item.word === "in")!, { pair: "nowhere" });
    expect(() => validateRootsContent(pair, ids)).toThrow(/Unknown particles pair: in → nowhere/);
    const self = structuredClone(source);
    Object.assign(self.particles.find((item) => item.word === "in")!, { pair: "in" });
    expect(() => validateRootsContent(self, ids)).toThrow(/Invalid particles: in/);
  });
  it("finds core words and particles by whole headword or family form", () => {
    const base = defaultBook.catalog.words[0];
    expect(findSenseMaps({ ...base, text: "charge", family: [] }).map((match) => match.href)).toEqual([
      "/core-words#charge",
    ]);
    expect(
      findSenseMaps({ ...base, text: "advanced", family: [{ text: "advance", pos: "v", meaning: "" }] }).map(
        (match) => match.kind,
      ),
    ).toEqual(["core"]);
    expect(findSenseMaps({ ...base, text: "by", family: [] }).map((match) => match.href)).toEqual(["/particles#by"]);
    expect(findSenseMaps({ ...base, text: "bypass", family: [] })).toEqual([]);
  });
  it("links a root chip only to a root that lists the word", () => {
    expect(rootOfPart("dict", "predict")?.id).toBe("dict");
    expect(rootOfPart("sent", "present")).toBeUndefined();
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
