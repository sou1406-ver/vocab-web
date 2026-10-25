import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { buildClozeContent } from "./build-cloze-content.mjs";

const root = new URL("../", import.meta.url);
const read = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [metadata, lessons, topics] = await Promise.all([
  read("data/generated/words.json"),
  read("data/generated/lessons.json"),
  read("data/generated/topics.json"),
]);
const details = new Map();
for (const file of await readdir(new URL("data/generated/word-details/", root))) {
  if (!file.endsWith(".json")) continue;
  for (const item of await read(`data/generated/word-details/${file}`)) {
    if (details.has(item.id)) throw new Error(`Duplicate detail: ${item.id}`);
    details.set(item.id, item);
  }
}
const ids = new Set();
const warnings = [];
const words = metadata.map((word) => {
  if (ids.has(word.id)) throw new Error(`Duplicate word: ${word.id}`);
  ids.add(word.id);
  if (!word.word?.trim() || !word.vi?.trim() || !lessons.some((l) => l.n === word.lesson))
    throw new Error(`Invalid word: ${word.id}`);
  const detail = details.get(word.id);
  if (!detail) throw new Error(`Missing details: ${word.id}`);
  const examples = (detail.ex ?? []).map((text, i) => ({ text, translation: detail.exVi?.[i] ?? "" }));
  if (!examples.length) warnings.push(`${word.id}: no example`);
  if (examples.some((e) => !e.translation)) warnings.push(`${word.id}: untranslated example`);
  return {
    id: word.id,
    lesson: word.lesson,
    text: word.word,
    pos: word.pos,
    ipa: word.ipa ?? "",
    meaning: word.vi,
    definition: word.def,
    examples,
    family: (detail.family ?? []).map((f) => ({ text: f.w, pos: f.pos, meaning: f.vi })),
    synonyms: detail.syn ?? [],
    antonyms: detail.ant ?? [],
    parts: detail.parts ?? [],
  };
});
if (words.length !== 600 || lessons.length !== 50) throw new Error("Expected 600 words and 50 lessons");
for (const lesson of lessons) {
  if (!topics.some((t) => t.id === lesson.unit)) throw new Error(`Unknown topic: ${lesson.unit}`);
  if (!words.some((w) => w.lesson === lesson.n)) throw new Error(`Empty lesson: ${lesson.n}`);
}
const payload = {
  lessons: lessons.map((l) => ({ id: l.n, title: l.title, translation: l.vi, topicId: l.unit })),
  topics: topics.map((t) => ({ id: t.id, title: t.name, english: t.en })),
  words,
};
const version = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12);
const output = new URL("src/content/", root);
await mkdir(output, { recursive: true });
await writeFile(new URL("catalog.json", output), JSON.stringify({ version, ...payload }) + "\n");
await writeFile(
  new URL("report.json", output),
  JSON.stringify({ version, words: words.length, lessons: lessons.length, warnings }, null, 2) + "\n",
);
console.log(`Content: ${words.length} words, ${lessons.length} lessons, ${warnings.length} warnings.`);
await buildClozeContent(words);
