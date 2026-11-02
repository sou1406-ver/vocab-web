import { library } from "./catalog";
import { prefixFamilies, roots, rootsContent } from "./roots";
import { analyseWordParts } from "./word-parts";
import { affixSlug, bareAffix as bare, isAffixRole, type AffixRole } from "./affix-slug";
import type { PrefixFamily } from "../domain/roots";

export { affixSlug, type AffixRole };
export interface AffixRootWord {
  rootId: string;
  rootForms: string[];
  text: string;
  pos: string;
  meaning: string;
}
export interface AffixBookWord {
  wordId: string;
  bookId: string;
  lesson: number;
  form: string;
  pos: string;
  meaning: string;
}
export interface AffixEntry {
  slug: string;
  role: AffixRole;
  text: string;
  meaning: string;
  rootWords: AffixRootWord[];
  bookWords: AffixBookWord[];
  /** Hand-picked words built on this prefix, with their analysis. */
  family?: PrefixFamily;
}

const display = (role: AffixRole, text: string) => (role === "prefix" ? `${bare(text)}-` : `-${bare(text)}`);

let index: Map<string, AffixEntry> | undefined;
function build() {
  const entries = new Map<string, AffixEntry>();
  const entry = (role: AffixRole, text: string, meaning = "") => {
    const slug = affixSlug(role, text);
    if (!bare(text)) return undefined;
    let found = entries.get(slug);
    if (!found) {
      found = { slug, role, text: display(role, text), meaning: "", rootWords: [], bookWords: [] };
      entries.set(slug, found);
    }
    found.meaning ||= rootsContent.affixes[found.text] ?? meaning;
    return found;
  };
  for (const root of roots)
    for (const word of root.words)
      for (const part of word.parts) {
        if (part.role !== "prefix" && part.role !== "suffix") continue;
        const found = entry(part.role, part.text);
        if (found && !found.rootWords.some((item) => item.text === word.text && item.rootId === root.id))
          found.rootWords.push({
            rootId: root.id,
            rootForms: root.forms,
            text: word.text,
            pos: word.pos,
            meaning: word.meaning,
          });
      }
  for (const family of prefixFamilies) {
    const found = entry("prefix", family.affix, family.meaning);
    if (found) found.family = family;
  }
  for (const book of library.books)
    for (const word of book.catalog.words)
      for (const form of analyseWordParts(word))
        for (const part of form.parts) {
          if (part.role !== "prefix" && part.role !== "suffix") continue;
          const found = entry(part.role, part.text, part.meaning);
          const family = word.family.find((item) => item.text === form.text);
          if (found && !found.bookWords.some((item) => item.form === form.text && item.bookId === book.id))
            found.bookWords.push({
              wordId: word.id,
              bookId: book.id,
              lesson: word.lesson,
              form: form.text,
              pos: family?.pos ?? word.pos,
              meaning: family?.meaning ?? word.meaning,
            });
        }
  return entries;
}
const all = () => (index ??= build());

export const affixes = () =>
  [...all().values()].sort((a, b) => a.role.localeCompare(b.role) || a.text.localeCompare(b.text));
export const affixBySlug = (slug: string) => all().get(slug);
// Chips link only to pages that exist, so a custom word with an unknown affix never leads to a 404.
export const affixHref = (role: string, text: string) =>
  isAffixRole(role) && all().has(affixSlug(role, text)) ? `/affixes/${affixSlug(role, text)}` : undefined;
