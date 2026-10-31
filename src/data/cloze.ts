import { wordsById, type Book, type ExerciseEntry } from "./catalog";
import { record, validateSnapshot } from "./validation";
import { emptySnapshot, normalizeAnswer } from "../domain/learning";
import type { Catalog, ClozeChoiceQuestion, Word, WordFormQuestion } from "../domain/types";
import { distractorPool, type TestedProgress } from "../domain/distractors";
import { shuffleSeeded } from "../domain/random";
import { classificationForms } from "../../scripts/lib/word-forms.mjs";

const optionSetKey = (options: string[]) => JSON.stringify(options.map(normalizeAnswer).sort());
function chooseOptions(answer: string, pool: string[], used: Set<string>, fixed: string[]) {
  const needed = 3 - fixed.length;
  const first = [answer, ...fixed, ...pool.slice(0, needed)];
  if (!used.has(optionSetKey(first))) return first;
  function search(start: number, chosen: string[]): string[] | undefined {
    if (chosen.length === needed) {
      const options = [answer, ...fixed, ...chosen];
      return used.has(optionSetKey(options)) ? undefined : options;
    }
    for (let i = start; i <= pool.length - (needed - chosen.length); i++) {
      const found = search(i + 1, [...chosen, pool[i]]);
      if (found) return found;
    }
  }
  return search(0, []) ?? first;
}
export function makeCatalogClozeQuestions(
  questions: readonly ClozeChoiceQuestion[],
  catalog: Catalog,
  sessionId: string,
  progress: TestedProgress = {},
): ClozeChoiceQuestion[] {
  const used = new Set<string>();
  const byId = new Map(catalog.words.map((word) => [word.id, word]));
  return questions.flatMap((q): ClozeChoiceQuestion[] => {
    if (!q.sourceId.startsWith("catalog:example:"))
      return [{ ...q, options: shuffleSeeded(q.options, `${sessionId}:${q.sourceId}`) }];
    const word = byId.get(q.wordId);
    if (!word) return [];
    const forms = classificationForms(word);
    const synonyms = new Set(word.synonyms.map(normalizeAnswer));
    const seen = new Set([normalizeAnswer(q.answer)]);
    const pool: { text: string; tier: number }[] = [];
    for (const candidate of distractorPool(word, catalog.words, progress, sessionId)) {
      const key = normalizeAnswer(candidate.text);
      const candidateForms = classificationForms(candidate);
      if (
        !key ||
        candidate.id === word.id ||
        seen.has(key) ||
        [...candidateForms].some((form) => forms.has(form) || synonyms.has(form)) ||
        [...forms].some((form) => candidate.synonyms.map(normalizeAnswer).includes(form))
      )
        continue;
      seen.add(key);
      const samePos =
        normalizeAnswer(candidate.pos).replace(/\./g, "") === normalizeAnswer(word.pos).replace(/\./g, "");
      const tier = (candidate.id.startsWith("family:") ? 2 : 0) + (samePos ? 0 : 1);
      pool.push({ text: candidate.text.trim(), tier });
    }
    if (pool.length < 3) return [];
    // Exhaust higher tiers before using a fallback; uniqueness must not lower difficulty.
    const sufficientTier = pool[2].tier;
    const fixed = pool.filter((item) => item.tier < sufficientTier).map((item) => item.text);
    const flexible = pool.filter((item) => item.tier === sufficientTier).map((item) => item.text);
    const options = chooseOptions(q.answer, flexible, used, fixed);
    used.add(optionSetKey(options));
    return [{ ...q, options: shuffleSeeded(options, `${sessionId}:${q.sourceId}:options`) }];
  });
}

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
  const validationQuestions = pack.questions.map((raw) => {
    const q = record(raw);
    if (
      q.kind === "cloze-choice" &&
      typeof q.sourceId === "string" &&
      q.sourceId.startsWith("catalog:example:") &&
      Array.isArray(q.options) &&
      q.options.length === 0
    ) {
      const word = catalog.words.find((item) => item.id === q.wordId);
      if (
        q.answer !== word?.text.trim() ||
        typeof q.prompt !== "string" ||
        q.prompt.match(/_{3,}/g)?.length !== 1 ||
        typeof q.sourceVersion !== "string" ||
        !q.sourceVersion.trim()
      )
        throw new Error("Nguồn câu catalog không hợp lệ.");
      // Raw sources have no choices. Validate their common fields as typed
      // questions; saved sessions still strictly require four cloze options.
      return { ...q, kind: "recall", options: [] };
    }
    return raw;
  });
  validateSnapshot({
    ...emptySnapshot(),
    session: {
      id: "validate-pack",
      contentVersion: catalog.version,
      title: "Cloze",
      mode: "practice",
      questions: validationQuestions,
      index: 0,
      phase: "question",
      feedback: null,
      startedAt: 0,
    },
  });
  return pack.questions as ClozeChoiceQuestion[];
}
export async function loadClozeLesson(book: Book, lessonId: number, signal?: AbortSignal) {
  const entry = exerciseEntry(book, lessonId);
  if (!entry?.count) throw new Error("Bài này chưa có câu điền chỗ trống phù hợp.");
  const response = await fetch(entry.url, { signal });
  if (!response.ok) throw new Error("Không tải được bài tập. Hãy thử lại.");
  return validateClozePack(await response.json(), entry, book.catalog);
}
