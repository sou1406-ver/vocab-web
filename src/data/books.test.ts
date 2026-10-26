import { describe, expect, it, vi } from "vitest";
import toeicBook from "../content/books/toeic-600/book.json";
import toeicCatalog from "../content/books/toeic-600/catalog.json";
import toeicExercises from "../content/books/toeic-600/exercise-manifest.json";
import type { Catalog, Word } from "../domain/types";

// A second book shaped like a future one: namespaced IDs and lesson numbers that overlap TOEIC's.
const second: Catalog = {
  version: "second000001",
  lessons: [{ id: 1, title: "Travel", translation: "Du lịch", topicId: "trips" }],
  topics: [{ id: "trips", title: "Chuyến đi", english: "Trips" }],
  words: ["contract", "ticket", "luggage", "passport", "hotel", "arrive"].map(
    (text): Word => ({
      id: `ielts-starter:${text}-1`,
      lesson: 1,
      text,
      pos: "n",
      ipa: "",
      meaning: `nghĩa ${text}`,
      definition: "",
      examples: [],
      family: [],
      synonyms: [],
      antonyms: [],
      parts: [],
    }),
  ),
};
vi.mock("../content/books/registry", () => ({
  registry: [
    { meta: toeicBook, catalog: toeicCatalog, exercises: toeicExercises },
    {
      meta: { id: "ielts-starter", title: "IELTS Starter", shortTitle: "IELTS Starter" },
      catalog: second,
      exercises: { lessons: [] },
    },
  ],
}));
vi.mock("./repository", () => ({ readSnapshot: vi.fn(), changeSnapshot: vi.fn() }));

const { activeBook, bookById, bookByVersion, bookOfWord, books, catalogFor, defaultBook, library } = await import(
  "./catalog"
);
const { changeSnapshot } = await import("./repository");
const { createAppStore } = await import("../state/store");
const { emptySnapshot } = await import("../domain/learning");
const { validateSnapshot } = await import("./validation");

describe("Book library", () => {
  it("keeps the original book first and exposes every word once", () => {
    expect(books.map((book) => book.id)).toEqual(["toeic-600", "ielts-starter"]);
    expect(defaultBook.id).toBe("toeic-600");
    expect(defaultBook.catalog.version).toBe("cbd94fa970e5");
    expect(library.words).toHaveLength(606);
    expect(library.wordsById.get("ielts-starter:contract-1")?.text).toBe("contract");
  });
  it("finds a word's book even when lesson numbers and word text overlap", () => {
    const toeicContract = toeicCatalog.words.find((word) => word.lesson === 1)!;
    expect(bookOfWord(toeicContract.id)?.id).toBe("toeic-600");
    expect(bookOfWord("ielts-starter:contract-1")?.id).toBe("ielts-starter");
    expect(bookOfWord("custom-word")).toBeUndefined();
    expect(catalogFor("ielts-starter:ticket-1")).toBe(second);
    expect(catalogFor("custom-word")).toBe(defaultBook.catalog);
    expect(bookByVersion("second000001")?.id).toBe("ielts-starter");
    expect(bookByVersion("outdated")).toBeUndefined();
  });
  it("follows the saved active book and falls back for missing or removed books", () => {
    const settings = emptySnapshot().settings;
    expect(activeBook(settings).id).toBe("toeic-600");
    expect(activeBook({ ...settings, bookId: "ielts-starter" }).id).toBe("ielts-starter");
    expect(activeBook({ ...settings, bookId: "removed-book" }).id).toBe("toeic-600");
    expect(bookById(undefined)).toBeUndefined();
  });
});

describe("Sessions across books", () => {
  const setup = (bookId?: string) => {
    let persisted = validateSnapshot({
      ...emptySnapshot(),
      settings: { ...emptySnapshot().settings, ...(bookId ? { bookId } : {}) },
    });
    vi.mocked(changeSnapshot).mockImplementation(async (reduce) => {
      persisted = validateSnapshot(reduce(persisted));
      return persisted;
    });
    const store = createAppStore();
    store.setState({ ready: true, data: persisted });
    return { store, session: () => persisted.session! };
  };
  it("versions a session and draws distractors from its words' own book", async () => {
    const { store, session } = setup();
    expect(await store.getState().start(second.words.slice(0, 1), "learn", "IELTS")).toBe(true);
    expect(session().contentVersion).toBe("second000001");
    const options = session().questions.flatMap((q) => ("options" in q ? (q.options ?? []) : []));
    expect(options.length).toBeGreaterThan(0);
    const secondMeanings = new Set(second.words.map((word) => word.meaning));
    expect(options.every((option) => secondMeanings.has(option))).toBe(true);
  });
  it("uses the active book for sessions made only of custom words", async () => {
    const custom: Word = { ...second.words[0], id: "custom-hello", text: "hello" };
    const { store, session } = setup("ielts-starter");
    expect(await store.getState().start([custom], "practice", "Custom")).toBe(true);
    expect(session().contentVersion).toBe("second000001");
  });
});
