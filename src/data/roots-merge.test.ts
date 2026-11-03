import { describe, expect, it } from "vitest";
import source from "../../content/roots/roots.json";
import { mergeRootsBatch } from "../../scripts/lib/roots-merge.mjs";
import { validateRootsContent } from "../../scripts/lib/roots-content.mjs";
import { defaultBook } from "./catalog";
import type { RootsContent } from "../domain/roots";

const content = source as RootsContent;
const ids = new Set(defaultBook.catalog.words.map((word) => word.id));
const word = (text: string) => ({
  text,
  pos: "n",
  parts: [{ text: "tract", role: "root" as const }],
  meaning: "nghĩa mới",
  logic: "logic mới",
  family: [],
});

describe("roots batch merge", () => {
  it("adds new roots, words, families, particles, senses and core words", () => {
    const { content: merged, added } = mergeRootsBatch(content, {
      newAffixes: { "zz-": "thử" },
      newRoots: [{ ...content.roots[0], id: "brand-new", words: [word("brandnew")] }],
      addedWords: { tract: [word("protractor")] },
      newPrefixFamilies: [{ affix: "zz-", meaning: "thử", image: "ảnh", words: [word("zzword")] }],
      newParticles: [
        { word: "under", core: "ở dưới", image: "ảnh", senses: [{ example: "a", meaning: "b", logic: "c" }] },
      ],
      addedParticleSenses: { by: [{ example: "by the hour", meaning: "theo giờ", logic: "đơn vị đo" }] },
      newCoreWords: [{ word: "run", core: "chạy", image: "ảnh", senses: [{ example: "a", meaning: "b", logic: "c" }] }],
    });
    expect(added).toEqual(
      expect.arrayContaining(["affix zz-", "root brand-new", "tract: protractor", "particle under", "core word run"]),
    );
    expect(merged.roots.find((root) => root.id === "tract")!.words.at(-1)!.text).toBe("protractor");
    expect(merged.particles!.find((item) => item.word === "by")!.senses.at(-1)!.example).toBe("by the hour");
    expect(() => validateRootsContent(merged, ids)).not.toThrow();
    // The input is never mutated.
    expect(content.roots.some((root) => root.id === "brand-new")).toBe(false);
  });
  it("never overwrites what the repo already has, so in-repo fixes survive a rebuilt batch", () => {
    const cid = content.roots.find((root) => root.id === "cid")!;
    const {
      content: merged,
      added,
      skipped,
    } = mergeRootsBatch(content, {
      newAffixes: { "pre-": "khác hẳn" },
      newRoots: [{ ...cid, meaning: "bản build cũ" }],
      addedWords: { rupt: [content.roots.find((root) => root.id === "rupt")!.words[0]] },
      newParticles: [{ ...content.particles![0], core: "bản cũ" }],
    });
    expect(added).toEqual([]);
    expect(skipped).toHaveLength(4);
    expect(JSON.stringify(merged)).toBe(JSON.stringify(content));
  });
});
