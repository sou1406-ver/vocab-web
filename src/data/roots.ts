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

export const prefixFamilies = rootsContent.prefixFamilies ?? [];
export const particles = rootsContent.particles ?? [];
export const prefixFamilyOf = (affix: string) => prefixFamilies.find((family) => family.affix === affix);
// A root chip outside its own page links only to a root that actually lists the word,
// so a look-alike spelling (the "sent" in "present") never points at the wrong family.
export const rootOfPart = (form: string, word: string) =>
  roots.find(
    (root) =>
      root.forms.some((item) => normalized(item) === normalized(form)) &&
      root.words.some((entry) => normalized(entry.text) === normalized(word)),
  );
