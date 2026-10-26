import { wordsById, type Book, type ExerciseEntry } from "./catalog";
import { record, validateSnapshot } from "./validation";
import { emptySnapshot, normalizeAnswer } from "../domain/learning";
import type { Catalog, ClozeChoiceQuestion, Word, WordFormQuestion } from "../domain/types";

export const exerciseEntry = (book: Book, lessonId: number) =>
  book.exercises.lessons.find((entry) => entry.lessonId === lessonId);
export function makeWordFormQuestions(
  questions: readonly ClozeChoiceQuestion[],
  words?: readonly Word[],
): WordFormQuestion[] {
  const byId = words ? new Map(words.map((word) => [word.id, word])) : wordsById;
  return questions
    .filter((q) => q.kind === "word-form-choice")
    .flatMap((q): WordFormQuestion[] => {
      const word = byId.get(q.wordId);
      if (!word) return [];
      const family = new Set([word.text, ...word.family.map((entry) => entry.text)].map(normalizeAnswer));
      const selected = q.options
        .map((option) => option.trim())
        .filter(
          (option) =>
            option && family.has(normalizeAnswer(option)) && normalizeAnswer(option) !== normalizeAnswer(q.answer),
        )
        .reduce(
          (shortest, option) =>
            !shortest || Array.from(option).length < Array.from(shortest).length ? option : shortest,
          "",
        );
      const cue = selected || (normalizeAnswer(word.text) !== normalizeAnswer(q.answer) ? word.text.trim() : "");
      if (!cue) return [];
      return [
        {
          kind: "word-form",
          wordId: q.wordId,
          prompt: `${q.prompt} (${cue})`,
          answer: q.answer,
          options: [],
          sourceId: q.sourceId,
          sourceVersion: q.sourceVersion,
        },
      ];
    });
}
export function validateClozePack(
  value: unknown,
  expected: Pick<ExerciseEntry, "lessonId" | "version" | "count">,
  catalog: Catalog,
): ClozeChoiceQuestion[] {
  const pack = record(value);
  if (
    pack.lessonId !== expected.lessonId ||
    pack.version !== expected.version ||
    !Array.isArray(pack.questions) ||
    pack.questions.length !== expected.count ||
    !pack.questions.length
  ) {
    throw new Error("Gói bài tập không đúng phiên bản. Hãy tải lại trang.");
  }
  const ids = new Set<string>();
  for (const raw of pack.questions) {
    const q = record(raw);
    const examplePrefix = `catalog:example:${q.wordId}:`;
    if (
      (q.kind !== "cloze-choice" && q.kind !== "word-form-choice") ||
      q.sourceVersion !== expected.version ||
      typeof q.sourceId !== "string" ||
      !(
        q.sourceId.startsWith(`v1:part5:${expected.lessonId}:`) ||
        (q.kind === "cloze-choice" &&
          q.sourceId.startsWith(examplePrefix) &&
          /^(0|[1-9]\d*)$/.test(q.sourceId.slice(examplePrefix.length)))
      ) ||
      ids.has(q.sourceId) ||
      !catalog.words.some((w) => w.id === q.wordId && w.lesson === expected.lessonId)
    )
      throw new Error("Liên kết bài tập không hợp lệ.");
    ids.add(q.sourceId);
  }
  const state = validateSnapshot({
    ...emptySnapshot(),
    session: {
      id: "validate-pack",
      contentVersion: catalog.version,
      title: "Cloze",
      mode: "practice",
      questions: pack.questions,
      index: 0,
      phase: "question",
      feedback: null,
      startedAt: 0,
    },
  });
  return state.session!.questions as ClozeChoiceQuestion[];
}
export async function loadClozeLesson(book: Book, lessonId: number, signal?: AbortSignal) {
  const entry = exerciseEntry(book, lessonId);
  if (!entry?.count) throw new Error("Bài này chưa có câu điền chỗ trống phù hợp.");
  const response = await fetch(entry.url, { signal });
  if (!response.ok) throw new Error("Không tải được bài tập. Hãy thử lại.");
  return validateClozePack(await response.json(), entry, book.catalog);
}
