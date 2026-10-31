import affixes from "../../data/generated/affixes.json";
import type { Word } from "../domain/types";

const table: Record<string, { type: string; vi: string }> = affixes;
export function analyseWordParts(word: Pick<Word, "family">) {
  return word.family
    .filter((form) => form.parts && form.parts.length >= 2)
    .map((form) => ({
      text: form.text,
      parts: form.parts!.map((part) => {
        const entry = table[part.trim().toLowerCase()];
        const role: "prefix" | "suffix" | "stem" =
          entry?.type === "prefix" ? "prefix" : entry?.type === "suffix" ? "suffix" : "stem";
        return { text: part, role, meaning: entry?.vi ?? "" };
      }),
    }));
}
