import { afterEach, describe, expect, it } from "vitest";
import {
  applyContentEdits,
  applyExerciseEdits,
  editId,
  originalOf,
  readEdit,
  readRestDocument,
  type ContentEdit,
} from "./content-edits";
import { bookOfWord, defaultBook, wordsById } from "./catalog";
import { exerciseEntry } from "./cloze";
import { countLearnedWords } from "../domain/cultivation";
import type { ClozeChoiceQuestion, Word } from "../domain/types";

const book = defaultBook;
const base = originalOf(book);
const first = base.words[0];
const edit = (kind: ContentEdit["kind"], target: string, data: unknown, extra: Partial<ContentEdit> = {}) =>
  readEdit({ kind, bookId: book.id, target, data, hidden: false, updatedAt: 1, ...extra })!;

afterEach(() => applyContentEdits([]));

describe("reading content edits", () => {
  it("accepts well-formed edits and rejects malformed or foreign ones", () => {
    expect(edit("word", first.id, { ...first, meaning: "nghĩa mới" })).toMatchObject({
      id: editId("word", book.id, first.id),
    });
    expect(
      readEdit({ kind: "word", bookId: book.id, target: first.id, data: { ...first, id: "other" }, hidden: false }),
    ).toBeNull();
    expect(readEdit({ kind: "word", bookId: "no-such-book", target: first.id, data: first, hidden: false })).toBeNull();
    expect(
      readEdit({
        kind: "lesson",
        bookId: book.id,
        target: "999",
        data: { title: "x", translation: "" },
        hidden: false,
      }),
    ).toBeNull();
    expect(readEdit({ kind: "word", bookId: book.id, target: first.id, data: null, hidden: true })).toMatchObject({
      hidden: true,
    });
  });
  it("reads Firestore REST documents without the SDK", () => {
    const parsed = readRestDocument({
      fields: {
        kind: { stringValue: "topic" },
        bookId: { stringValue: book.id },
        target: { stringValue: base.topics[0].id },
        data: { stringValue: JSON.stringify({ title: "Chủ đề mới" }) },
        hidden: { booleanValue: false },
        updatedAt: { timestampValue: "2026-11-03T00:00:00Z" },
      },
    });
    expect(parsed).toMatchObject({
      kind: "topic",
      data: { title: "Chủ đề mới" },
      updatedAt: Date.parse("2026-11-03T00:00:00Z"),
    });
  });
});

describe("applying content edits", () => {
  it("edits a word in place, changes the catalog version and restores both when removed", () => {
    applyContentEdits([edit("word", first.id, { ...first, meaning: "nghĩa mới" })]);
    expect(wordsById.get(first.id)?.meaning).toBe("nghĩa mới");
    expect(book.catalog.version).not.toBe(base.version);
    applyContentEdits([]);
    expect(wordsById.get(first.id)?.meaning).toBe(first.meaning);
    expect(book.catalog.version).toBe(base.version);
  });
  it("hides a word from lessons and lookups while its progress stays in the snapshot", () => {
    applyContentEdits([edit("word", first.id, null, { hidden: true })]);
    expect(book.catalog.words.some((word) => word.id === first.id)).toBe(false);
    expect(bookOfWord(first.id)).toBeUndefined();
    const progress = {
      [first.id]: {
        startedAt: 0,
        startedDay: "2026-11-01",
        box: 1,
        dueAt: 0,
        correct: 1,
        incorrect: 0,
        tested: true,
        policyVersion: 1 as const,
      },
    };
    expect(countLearnedWords(progress, (id) => Boolean(bookOfWord(id)))).toBe(0);
    applyContentEdits([]);
    expect(countLearnedWords(progress, (id) => Boolean(bookOfWord(id)))).toBe(1);
  });
  it("adds a word at the end of its lesson under a book-prefixed id", () => {
    const added: Word = { ...first, id: `${book.id}:admin-sample`, text: "sample", lesson: first.lesson };
    applyContentEdits([edit("word", added.id, added)]);
    const lessonWords = book.catalog.words.filter((word) => word.lesson === first.lesson);
    expect(lessonWords.at(-1)?.id).toBe(added.id);
    expect(bookOfWord(added.id)?.id).toBe(book.id);
    expect(book.catalog.words).toHaveLength(base.words.length + 1);
  });
  it("renames lessons and topics", () => {
    const lesson = base.lessons[0];
    const topic = base.topics[0];
    applyContentEdits([
      edit("lesson", String(lesson.id), { title: "New title", translation: "Tên mới" }),
      edit("topic", topic.id, { title: "Chủ đề mới" }),
    ]);
    expect(book.catalog.lessons[0]).toMatchObject({ id: lesson.id, title: "New title", translation: "Tên mới" });
    expect(book.catalog.topics[0]).toMatchObject({ id: topic.id, title: "Chủ đề mới" });
  });
});

describe("exercise edits", () => {
  const entry = base.exercises.find((item) => item.count > 1)!;
  const lessonWord = base.words.find((word) => word.lesson === entry.lessonId)!;
  const question = (sourceId: string, prompt = "We signed the ___ today."): ClozeChoiceQuestion => ({
    kind: "cloze-choice",
    wordId: lessonWord.id,
    prompt,
    answer: lessonWord.text,
    options: [lessonWord.text, "alpha", "beta", "gamma"],
    sourceId,
    sourceVersion: entry.version,
  });
  const pack = [question(`v1:part5:${entry.lessonId}:1`), question(`v1:part5:${entry.lessonId}:2`)];
  it("edits, hides and adds questions with a new pack version and counts", () => {
    applyContentEdits([
      edit("exercise", pack[0].sourceId, { ...pack[0], prompt: "Edited ___ here." }, { lessonId: entry.lessonId }),
      edit("exercise", pack[1].sourceId, { ...pack[1] }, { lessonId: entry.lessonId, hidden: true }),
      edit("exercise", "admin:new-1", question("admin:new-1", "Brand new ___."), { lessonId: entry.lessonId }),
    ]);
    const current = exerciseEntry(book, entry.lessonId)!;
    expect(current.version).not.toBe(entry.version);
    expect(current.count).toBe(entry.count);
    const result = applyExerciseEdits(book, entry.lessonId, pack);
    expect(result.map((q) => [q.sourceId, q.prompt])).toEqual([
      [pack[0].sourceId, "Edited ___ here."],
      ["admin:new-1", "Brand new ___."],
    ]);
    expect(result.every((q) => q.sourceVersion === current.version)).toBe(true);
    expect(book.exercises.lessons.find((item) => item.lessonId === entry.lessonId)?.version).toBe(current.version);
  });
  it("drops questions whose word was hidden", () => {
    applyContentEdits([edit("word", lessonWord.id, null, { hidden: true })]);
    expect(applyExerciseEdits(book, entry.lessonId, pack)).toEqual(pack);
    applyContentEdits([
      edit("word", lessonWord.id, null, { hidden: true }),
      edit("exercise", "admin:new-2", question("admin:new-2", "Another ___."), { lessonId: entry.lessonId }),
    ]);
    expect(applyExerciseEdits(book, entry.lessonId, pack)).toEqual([]);
  });
});
