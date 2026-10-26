import { readFile, readdir } from "node:fs/promises";

// Reads the V1 pipeline output (tools/build_data.py → data/generated) into catalog entries.
export async function buildToeic600(root) {
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
      family: (detail.family ?? []).map((f) => ({ text: f.w, pos: f.pos, meaning: f.vi, parts: f.parts ?? [] })),
      synonyms: detail.syn ?? [],
      antonyms: detail.ant ?? [],
      parts: detail.parts ?? [],
    };
  });
  for (const lesson of lessons) {
    if (!topics.some((t) => t.id === lesson.unit)) throw new Error(`Unknown topic: ${lesson.unit}`);
  }
  return {
    payload: {
      lessons: lessons.map((l) => ({ id: l.n, title: l.title, translation: l.vi, topicId: l.unit })),
      topics: topics.map((t) => ({ id: t.id, title: t.name, english: t.en })),
      words,
    },
    warnings,
    part5: (await read("data/generated/exercises.json")).lessons,
  };
}
