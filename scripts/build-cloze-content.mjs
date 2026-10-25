import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { convertLesson, createCatalogCloze } from "./lib/cloze-content.mjs";

export async function buildClozeContent(words) {
  const root = new URL("../", import.meta.url);
  const source = JSON.parse(await readFile(new URL("data/generated/exercises.json", root), "utf8"));
  const directory = new URL("public/exercises/cloze/", root);
  await mkdir(directory, { recursive: true });
  for (const file of await readdir(directory)) await unlink(new URL(file, directory));
  const lessons = [];
  const skipped = [];
  const linked = [];
  const byKind = { "word-form-choice": 0, "cloze-choice": 0 };
  let sourceQuestions = 0;
  let catalogQuestions = 0;
  for (const [id, data] of Object.entries(source.lessons)) {
    const lessonId = Number(id);
    if (!Number.isInteger(lessonId) || !words.some((w) => w.lesson === lessonId))
      throw new Error(`Invalid lesson: ${id}`);
    const result = convertLesson(lessonId, data.part5, words);
    const examples = createCatalogCloze(lessonId, words);
    const items = [...result.questions, ...examples];
    catalogQuestions += examples.length;
    sourceQuestions += data.part5.length;
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
    lessons.push({ lessonId, version, count: questions.length, kinds, url: `/exercises/cloze/${file}` });
  }
  const count = lessons.reduce((sum, l) => sum + l.count, 0);
  await writeFile(new URL("src/content/exercise-manifest.json", root), JSON.stringify({ lessons }) + "\n");
  await writeFile(
    new URL("src/content/exercise-report.json", root),
    JSON.stringify(
      {
        sourceQuestions,
        catalogQuestions,
        count,
        byKind,
        recovered: linked.filter((entry) => entry.method === "inflection"),
        skipped,
        linked,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Exercises: ${count} choices (${byKind["word-form-choice"]} word form, ${byKind["cloze-choice"]} cloze; ${catalogQuestions} catalog examples), ${skipped.length} Part 5 skipped; ${linked.filter((entry) => entry.method === "inflection").length} inflection links.`,
  );
}
