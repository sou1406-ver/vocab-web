import source from "../content/catalog.json";
import type { Catalog, Word } from "../domain/types";

export const catalog: Catalog = source;
export const wordsById = new Map(catalog.words.map((word) => [word.id, word]));
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
export function findWords(query: string, words: Word[]) {
  const search = normalize(query);
  return words.filter((word) =>
    normalize([word.text, word.meaning, ...word.family.map((f) => f.text)].join(" ")).includes(search),
  );
}
