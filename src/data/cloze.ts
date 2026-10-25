import manifest from "../content/exercise-manifest.json";
import { catalog } from "./catalog";
import { record, validateSnapshot } from "./validation";
import { emptySnapshot } from "../domain/learning";
import type { ClozeChoiceQuestion } from "../domain/types";

export const clozeLessons = manifest.lessons;
export function validateClozePack(
  value: unknown,
  expected: { lessonId: number; version: string; count: number },
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
    if (
      (q.kind !== "cloze-choice" && q.kind !== "word-form-choice") ||
      q.sourceVersion !== expected.version ||
      typeof q.sourceId !== "string" ||
      !q.sourceId.startsWith(`v1:part5:${expected.lessonId}:`) ||
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
export async function loadClozeLesson(lessonId: number, signal?: AbortSignal) {
  const entry = clozeLessons.find((l) => l.lessonId === lessonId);
  if (!entry?.count) throw new Error("Bài này chưa có câu điền chỗ trống phù hợp.");
  const response = await fetch(entry.url, { signal });
  if (!response.ok) throw new Error("Không tải được bài tập. Hãy thử lại.");
  return validateClozePack(await response.json(), entry);
}
