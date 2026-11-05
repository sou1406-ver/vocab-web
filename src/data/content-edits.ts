import { library, type Book, type ExerciseEntry } from "./catalog";
import { isWord, record } from "./validation";
import type { ClozeChoiceQuestion, Lesson, Topic, Word } from "../domain/types";

/*
 * Admin content edits stored in Firestore `contentEdits/{kind~bookId~target}` and layered over the bundled catalog.
 * - word: edit (data = full Word, same id), add (data = Word with a new "<bookId>:" id) or hide (hidden = true).
 * - lesson / topic: title (and lesson translation) overrides.
 * - exercise: authored cloze / word-form question edit, add or hide inside one lesson pack.
 * Edits always apply on top of the original bundle, so removing an edit restores the original content.
 * Hidden words keep every learner's progress; they only disappear from lessons, review and the library.
 * Word, lesson and topic edits change catalog.version; exercise edits change only that lesson's pack version.
 */
export type EditKind = "word" | "lesson" | "topic" | "exercise";
export interface ContentEdit {
  id: string;
  kind: EditKind;
  bookId: string;
  target: string;
  data: unknown;
  hidden: boolean;
  lessonId?: number;
  updatedAt: number;
  updatedBy?: string;
}
export const editId = (kind: EditKind, bookId: string, target: string) => `${kind}~${bookId}~${target}`;

// FNV-1a: a short, stable fingerprint for version suffixes and change detection.
export function fingerprint(value: unknown) {
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;

// Catalog-example sources carry no options: their distractors are generated at study time.
export const isCatalogExample = (sourceId: string) => sourceId.startsWith("catalog:example:");
export function isExerciseQuestion(value: unknown, sourceId: string): value is ClozeChoiceQuestion {
  const q = record(value);
  const options = q.options;
  return (
    (q.kind === "cloze-choice" || q.kind === "word-form-choice") &&
    q.sourceId === sourceId &&
    text(q.wordId, 200) &&
    text(q.prompt, 600) &&
    (q.prompt as string).match(/_{3,}/g)?.length === 1 &&
    text(q.answer, 120) &&
    Array.isArray(options) &&
    (isCatalogExample(sourceId)
      ? q.kind === "cloze-choice" && options.length === 0
      : options.length >= 2 &&
        options.length <= 6 &&
        options.every((option) => text(option, 120)) &&
        new Set(options).size === options.length &&
        options.includes(q.answer))
  );
}

// Keeps only well-formed edits for known books; anything else is ignored rather than breaking the app.
export function readEdit(value: unknown): ContentEdit | null {
  try {
    const raw = record(value);
    const kind = raw.kind;
    if (kind !== "word" && kind !== "lesson" && kind !== "topic" && kind !== "exercise") return null;
    if (!text(raw.bookId, 80) || !text(raw.target, 200) || typeof raw.hidden !== "boolean") return null;
    const book = library.bookById(raw.bookId as string);
    if (!book) return null;
    const target = raw.target as string;
    const data = raw.data;
    const lessonId = raw.lessonId === undefined ? undefined : Number(raw.lessonId);
    const lessonExists = (id: unknown) => typeof id === "number" && book.catalog.lessons.some((l) => l.id === id);
    if (kind === "word") {
      if (raw.hidden && data == null) {
        // Hiding needs nothing else; the word may be original or an earlier addition.
      } else if (!isWord(data) || data.id !== target || !lessonExists(data.lesson) || !text(data.text, 120))
        return null;
    } else if (kind === "lesson") {
      const d = record(data);
      if (!lessonExists(Number(target)) || !text(d.title, 120) || typeof d.translation !== "string") return null;
    } else if (kind === "topic") {
      if (!book.catalog.topics.some((t) => t.id === target) || !text(record(data).title, 80)) return null;
    } else {
      if (!lessonExists(lessonId)) return null;
      if (!(raw.hidden && data == null) && !isExerciseQuestion(data, target)) return null;
    }
    return {
      id: editId(kind, raw.bookId as string, target),
      kind,
      bookId: raw.bookId as string,
      target,
      data: data ?? null,
      hidden: raw.hidden,
      ...(lessonId === undefined ? {} : { lessonId }),
      updatedAt: Number(raw.updatedAt) || 0,
      ...(typeof raw.updatedBy === "string" ? { updatedBy: raw.updatedBy } : {}),
    };
  } catch {
    return null;
  }
}

interface Original {
  version: string;
  words: Word[];
  lessons: Lesson[];
  topics: Topic[];
  exercises: ExerciseEntry[];
}
const originals = new Map<string, Original>();
const original = (book: Book) => {
  let found = originals.get(book.id);
  if (!found) {
    found = {
      version: book.catalog.version,
      words: [...book.catalog.words],
      lessons: book.catalog.lessons.map((lesson) => ({ ...lesson })),
      topics: book.catalog.topics.map((topic) => ({ ...topic })),
      exercises: book.exercises.lessons.map((entry) => ({ ...entry, kinds: { ...entry.kinds } })),
    };
    originals.set(book.id, found);
  }
  return found;
};
export const originalOf = (book: Book) => original(book);
let exerciseEdits = new Map<string, ContentEdit[]>();
let applied: ContentEdit[] = [];
export const appliedEdits = () => applied;
let rejected: ContentEdit[] = [];
export const rejectedEdits = () => rejected;

// Rebuilds every book from its original bundle plus the given edits, mutating the shared catalog objects.
export function applyContentEdits(edits: readonly ContentEdit[]) {
  const nextExercises = new Map<string, ContentEdit[]>();
  rejected = [];
  for (const book of library.books) {
    const base = original(book);
    const mine = edits.filter((edit) => {
      if (edit.bookId !== book.id) return false;
      const word = edit.kind === "word" ? base.words.find((item) => item.id === edit.target) : undefined;
      if (!edit.hidden && word?.lexeme && (!isWord(edit.data) || edit.data.lexeme?.id !== word.lexeme.id)) {
        rejected.push(edit);
        return false;
      }
      return true;
    });
    const wordEdits = new Map(mine.filter((edit) => edit.kind === "word").map((edit) => [edit.target, edit]));
    const words: Word[] = [];
    for (const word of base.words) {
      const edit = wordEdits.get(word.id);
      if (edit?.hidden) continue;
      words.push(edit && isWord(edit.data) ? { ...edit.data, id: word.id } : word);
    }
    for (const edit of wordEdits.values()) {
      const added = edit.data;
      if (edit.hidden || !isWord(added) || base.words.some((word) => word.id === edit.target)) continue;
      // New words join the end of their lesson so lesson order stays intact.
      const after = words.findLastIndex((word) => word.lesson <= added.lesson);
      words.splice(after + 1, 0, added);
    }
    const lessonEdits = new Map(mine.filter((edit) => edit.kind === "lesson").map((edit) => [edit.target, edit]));
    const lessons = base.lessons.map((lesson) => {
      const data = lessonEdits.get(String(lesson.id))?.data;
      return data
        ? { ...lesson, title: String(record(data).title), translation: String(record(data).translation) }
        : lesson;
    });
    const topicEdits = new Map(mine.filter((edit) => edit.kind === "topic").map((edit) => [edit.target, edit]));
    const topics = base.topics.map((topic) => {
      const data = topicEdits.get(topic.id)?.data;
      return data ? { ...topic, title: String(record(data).title) } : topic;
    });
    const catalogEdits = mine.filter((edit) => edit.kind !== "exercise");
    book.catalog.words.splice(0, book.catalog.words.length, ...words);
    book.catalog.lessons.splice(0, book.catalog.lessons.length, ...lessons);
    book.catalog.topics.splice(0, book.catalog.topics.length, ...topics);
    book.catalog.version = catalogEdits.length ? `${base.version}+e${fingerprint(catalogEdits)}` : base.version;
    const entries = base.exercises.map((entry) => ({ ...entry, kinds: { ...entry.kinds } }));
    const byLesson = new Map<number, ContentEdit[]>();
    for (const edit of mine)
      if (edit.kind === "exercise" && edit.lessonId !== undefined)
        byLesson.set(edit.lessonId, [...(byLesson.get(edit.lessonId) ?? []), edit]);
    for (const [lessonId, list] of byLesson) {
      let entry = entries.find((item) => item.lessonId === lessonId);
      if (!entry) {
        entry = { lessonId, version: "admin", count: 0, kinds: { "word-form-choice": 0, "cloze-choice": 0 }, url: "" };
        entries.push(entry);
      }
      nextExercises.set(`${book.id}:${lessonId}`, list);
      for (const edit of list) {
        const kind = record(edit.data).kind as keyof ExerciseEntry["kinds"] | undefined;
        const added = !edit.target.startsWith("v1:") && !edit.target.startsWith("catalog:");
        if (edit.hidden && !added && kind && kind in entry.kinds) {
          entry.count--;
          entry.kinds[kind]--;
        } else if (!edit.hidden && added && kind && kind in entry.kinds) {
          entry.count++;
          entry.kinds[kind]++;
        }
      }
      entry.version = `${base.exercises.find((item) => item.lessonId === lessonId)?.version ?? "admin"}+e${fingerprint(list)}`;
    }
    book.exercises.lessons.splice(0, book.exercises.lessons.length, ...entries);
  }
  exerciseEdits = nextExercises;
  applied = [...edits];
  library.refresh();
}

// Layers a lesson's exercise edits over its bundled pack (already validated against the original entry).
export function applyExerciseEdits(book: Book, lessonId: number, pack: readonly ClozeChoiceQuestion[]) {
  const edits = exerciseEdits.get(`${book.id}:${lessonId}`) ?? [];
  const version = book.exercises.lessons.find((entry) => entry.lessonId === lessonId)?.version;
  if (!edits.length || !version) return [...pack];
  const byId = new Map(edits.map((edit) => [edit.target, edit]));
  const lessonWords = new Set(book.catalog.words.filter((word) => word.lesson === lessonId).map((word) => word.id));
  const usable = (q: ClozeChoiceQuestion) => lessonWords.has(q.wordId);
  const questions: ClozeChoiceQuestion[] = [];
  for (const question of pack) {
    const edit = byId.get(question.sourceId);
    if (edit?.hidden) continue;
    const next = edit && isExerciseQuestion(edit.data, question.sourceId) ? edit.data : question;
    if (usable(next)) questions.push({ ...next, sourceVersion: version });
  }
  for (const edit of edits)
    if (!edit.hidden && !pack.some((q) => q.sourceId === edit.target) && isExerciseQuestion(edit.data, edit.target))
      if (usable(edit.data)) questions.push({ ...edit.data, sourceVersion: version });
  return questions;
}

// Firestore REST typed values → plain JSON, so learners need no Firebase SDK to read edits.
type RestValue = Record<string, unknown>;
const fromRest = (value: RestValue): unknown => {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return Date.parse(String(value.timestampValue));
  if ("nullValue" in value) return null;
  return undefined;
};
export function readRestDocument(document: unknown): ContentEdit | null {
  const fields = record(record(document).fields);
  const plain = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromRest(record(value))]));
  let data: unknown = null;
  if (typeof plain.data === "string" && plain.data) {
    try {
      data = JSON.parse(plain.data);
    } catch {
      return null;
    }
  }
  return readEdit({ ...plain, data });
}
