import { describe, expect, it } from "vitest";
import { affixBySlug, affixes, affixHref, affixSlug } from "./affixes";
import { roots } from "./roots";

describe("affix pages", () => {
  it("builds unambiguous slugs for prefixes and suffixes", () => {
    expect(affixSlug("prefix", "con-")).toBe("prefix-con");
    expect(affixSlug("suffix", "-ary")).toBe("suffix-ary");
    expect(affixSlug("prefix", "in-")).not.toBe(affixSlug("suffix", "-in"));
  });
  it("has a page for -ary with its meaning and the root word contemporary", () => {
    const ary = affixBySlug("suffix-ary")!;
    expect(ary.text).toBe("-ary");
    expect(ary.meaning).toBeTruthy();
    expect(ary.rootWords.some((word) => word.text === "contemporary")).toBe(true);
  });
  it("gives every affix chip in the roots content a page", () => {
    for (const root of roots)
      for (const word of root.words)
        for (const part of word.parts)
          if (part.role === "prefix" || part.role === "suffix")
            expect(affixHref(part.role, part.text), `${word.text}: ${part.text}`).toBeDefined();
  });
  it("lists each affix once and never links roots or unknown affixes", () => {
    const slugs = affixes().map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(affixHref("root", "tempor")).toBeUndefined();
    expect(affixHref("suffix", "-zzqx")).toBeUndefined();
  });
});

describe("book word chips", () => {
  it("have an affix page for every analysed prefix and suffix", async () => {
    const { library } = await import("./catalog");
    const { analyseWordParts } = await import("./word-parts");
    for (const book of library.books)
      for (const word of book.catalog.words)
        for (const form of analyseWordParts(word))
          for (const part of form.parts)
            if (part.role === "prefix" || part.role === "suffix")
              expect(affixBySlug(affixSlug(part.role, part.text)), `${form.text}: ${part.text}`).toBeDefined();
  });
});
