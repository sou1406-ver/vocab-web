import source from "../../content/roots/roots.json";
import type { RootsContent } from "../domain/roots";
import type { Word } from "../domain/types";

export const rootsContent = source as RootsContent;
export const roots = rootsContent.roots;
export const rootById = (id: string) => roots.find((root) => root.id === id);
const normalized = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function findWordRoots(word: Pick<Word, "text" | "family">) {
  const names = new Set([word.text, ...word.family.map((form) => form.text)].map(normalized));
  return roots.flatMap((root) =>
    root.words
      .filter(
        (entry) => names.has(normalized(entry.text)) || entry.family.some((form) => names.has(normalized(form.text))),
      )
      .map((entry) => ({ root, word: entry })),
  );
}
