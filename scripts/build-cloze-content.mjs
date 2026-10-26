import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { convertLesson, createCatalogCloze } from "./lib/cloze-content.mjs";

// Writes per-lesson packs to public/exercises/<bookId>/cloze/ and returns the manifest and report.
// The caller cleans public/exercises/ first so no stale pack survives.
export async function buildClozeContent(bookId, words, catalogLessons, part5 = {}) {
  const root = new URL("../", import.meta.url);
  const urlPath = `/exercises/${bookId}/cloze/`;
  const directory = new URL(`public${urlPath}`, root);
  await mkdir(directory, { recursive: true });
  const lessons = [];
  const skipped = [];
  const linked = [];
  const byKind = { "word-form-choice": 0, "cloze-choice": 0 };
  let sourceQuestions = 0;
  let catalogQuestions = 0;
  for (const id of Object.keys(part5))
    if (!words.some((w) => w.lesson === Number(id))) throw new Error(`Invalid lesson: ${bookId}/${id}`);
  for (const { id: lessonId } of catalogLessons) {
    const authored = part5[String(lessonId)]?.part5 ?? [];
    const result = convertLesson(lessonId, authored, words);
    const examples = createCatalogCloze(lessonId, words, catalogLessons);
    const items = [...result.questions, ...examples];
    catalogQuestions += examples.length;
    sourceQuestions += authored.length;
    skipped.push(...result.skipped);
    linked.push(...result.linked);
    const kinds = { "word-form-choice": 0, "cloze-choice": 0 };
    for (const q of items) {
      kinds[q.kind]++;
      byKind[q.kind]++;
    }
    const version = createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 12);
    const questions = items.map((q) => ({ ...q, sourceVersion: version }));
    const file = `${lessonId}.${version}.json`;
    await writeFile(new URL(file, directory), JSON.stringify({ lessonId, version, questions }) + "\n");
    lessons.push({ lessonId, version, count: questions.length, kinds, url: urlPath + file });
  }
  const count = lessons.reduce((sum, l) => sum + l.count, 0);
  const recovered = linked.filter((entry) => entry.method === "inflection");
  console.log(
    `${bookId} exercises: ${count} choices (${byKind["word-form-choice"]} word form, ${byKind["cloze-choice"]} cloze; ${catalogQuestions} catalog examples), ${skipped.length} Part 5 skipped; ${recovered.length} inflection links.`,
  );
  return {
    manifest: { lessons },
    report: { sourceQuestions, catalogQuestions, count, byKind, recovered, skipped, linked },
  };
}
