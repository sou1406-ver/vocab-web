import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { catalog } from "./catalog";
import { isWord, validateSnapshot } from "./validation";
import { emptySnapshot } from "../domain/learning";
import type { Word } from "../domain/types";

describe("Family parts for Build", () => {
  it("preserves the source parts of every family entry, including 982 entries with multiple parts", () => {
    const directory = new URL("../../data/generated/word-details/", import.meta.url);
    const source = new Map<string, { family?: { parts?: string[] }[] }>();
    for (const file of readdirSync(directory).filter((name) => name.endsWith(".json"))) {
      for (const word of JSON.parse(readFileSync(new URL(file, directory), "utf8"))) source.set(word.id, word);
    }
    let count = 0;
    for (const word of catalog.words) {
      const original = source.get(word.id)!;
      expect(original).toBeDefined();
      expect(word.family).toHaveLength(original.family?.length ?? 0);
      for (const [index, entry] of word.family.entries()) {
        expect(entry.parts).toEqual(original.family![index].parts ?? []);
        if (entry.parts!.length >= 2) count++;
      }
      expect(isWord(word)).toBe(true);
    }
    expect(count).toBe(982);
  });
  it("includes family parts in the catalog fingerprint", () => {
    const previousPayload = {
      lessons: catalog.lessons,
      topics: catalog.topics,
      words: catalog.words.map((word) => ({
        ...word,
        family: word.family.map((entry) => ({ text: entry.text, pos: entry.pos, meaning: entry.meaning })),
      })),
    };
    const previousVersion = createHash("sha256").update(JSON.stringify(previousPayload)).digest("hex").slice(0, 12);
    expect(catalog.version).not.toBe(previousVersion);
  });
  it("accepts optional family parts and reads old custom words and backups unchanged", () => {
    const current: Word = {
      ...catalog.words[0],
      id: "with-family-parts",
      family: [{ text: "agreement", pos: "n", meaning: "agreement", parts: ["agree", "ment"] }],
    };
    const legacy = structuredClone(current);
    legacy.id = "legacy-family";
    delete legacy.family[0].parts;
    expect(isWord(current)).toBe(true);
    expect(isWord(legacy)).toBe(true);
    expect(isWord({ ...current, family: [{ ...current.family[0], parts: [] }] })).toBe(true);
    const state = { ...emptySnapshot(), customWords: [legacy, current] };
    const restored = JSON.parse(JSON.stringify(state));
    expect(validateSnapshot(restored)).toBe(restored);
    expect(restored).toEqual(state);
    expect(restored.schemaVersion).toBe(2);
    expect(restored.customWords[0].family[0]).not.toHaveProperty("parts");
  });
  it.each([{ parts: null }, { parts: "agree+ment" }, { parts: ["agree", 1] }, { parts: { root: "agree" } }])(
    "rejects invalid family parts $parts",
    ({ parts }) => {
      const word = { ...catalog.words[0], family: [{ text: "agreement", pos: "n", meaning: "agreement", parts }] };
      expect(isWord(word)).toBe(false);
      expect(() => validateSnapshot({ ...emptySnapshot(), customWords: [word] })).toThrow();
    },
  );
});
