import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { convertLesson } from "./lib/cloze-content.mjs";

export async function buildClozeContent(words) {
  const root = new URL("../", import.meta.url);
  const source = JSON.parse(await readFile(new URL("data/generated/exercises.json", root), "utf8"));
  const directory = new URL("public/exercises/cloze/", root);
  await mkdir(directory, { recursive: true });
  const lessons = [];
  const skipped = [];
  for (const [id, data] of Object.entries(source.lessons)) {
    const lessonId = Number(id);
    if (!Number.isInteger(lessonId) || !words.some((w) => w.lesson === lessonId))
      throw new Error(`Invalid lesson: ${id}`);
    const result = convertLesson(lessonId, data.part5, words);
    skipped.push(...result.skipped);
    const version = createHash("sha256").update(JSON.stringify(result.questions)).digest("hex").slice(0, 12);
    const questions = result.questions.map((q) => ({ ...q, sourceVersion: version }));
    const file = `${lessonId}.${version}.json`;
    await writeFile(new URL(file, directory), JSON.stringify({ lessonId, version, questions }) + "\n");
    lessons.push({ lessonId, version, count: questions.length, url: `/exercises/cloze/${file}` });
  }
  const count = lessons.reduce((sum, l) => sum + l.count, 0);
  await writeFile(new URL("src/content/exercise-manifest.json", root), JSON.stringify({ lessons }) + "\n");
  await writeFile(
    new URL("src/content/exercise-report.json", root),
    JSON.stringify({ count, skipped }, null, 2) + "\n",
  );
  console.log(
    `Cloze: ${count} authored choices in ${lessons.length} lesson packs; ${skipped.length} skipped (see exercise-report.json).`,
  );
}
