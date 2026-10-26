import { registry } from "../content/books/registry";
import type { Catalog, Snapshot, Word } from "../domain/types";

export interface ExerciseEntry {
  lessonId: number;
  version: string;
  count: number;
  kinds: Record<"word-form-choice" | "cloze-choice", number>;
  url: string;
}
export interface Book {
  id: string;
  title: string;
  shortTitle: string;
  legacyWordIds?: boolean;
  catalog: Catalog;
  exercises: { lessons: ExerciseEntry[] };
}

export function createLibrary(books: readonly Book[]) {
  if (!books.length) throw new Error("No books");
  const byId = new Map(books.map((book) => [book.id, book]));
  const owner = new Map<string, Book>();
  for (const book of books) for (const word of book.catalog.words) owner.set(word.id, book);
  const words = books.flatMap((book) => book.catalog.words);
  return {
    books,
    defaultBook: books[0],
    words,
    wordsById: new Map(words.map((word) => [word.id, word])),
    bookById: (id: string | undefined) => (id === undefined ? undefined : byId.get(id)),
    bookOfWord: (wordId: string | undefined) => (wordId === undefined ? undefined : owner.get(wordId)),
    bookByVersion: (version: string) => books.find((book) => book.catalog.version === version),
  };
}

export const library = createLibrary(
  registry.map(({ meta, catalog, exercises }) => ({ ...meta, catalog, exercises }) as Book),
);
export const { books, defaultBook, wordsById } = library;
export const bookById = library.bookById;
export const bookOfWord = library.bookOfWord;
export const bookByVersion = library.bookByVersion;

// Unknown or removed book IDs fall back to the default book instead of breaking old snapshots.
export const activeBook = (settings: Snapshot["settings"]) => bookById(settings.bookId) ?? defaultBook;
// Custom words and test fixtures belong to no book; they use the given fallback (default book).
export const catalogFor = (wordId: string | undefined, fallback: Book = defaultBook) =>
  (bookOfWord(wordId) ?? fallback).catalog;

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
