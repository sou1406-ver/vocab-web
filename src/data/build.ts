import affixes from "../../data/generated/affixes.json";
import { catalog } from "./catalog";
import { shuffleSeeded } from "../domain/random";
import type { BuildQuestion, Word } from "../domain/types";

// Ported from main:src/lib/data.ts, used by main:src/lib/quiz.ts buildQs.
export const AFFIX_GROUPS = [
  ["-ion", "-tion", "-sion", "-ation", "-ition", "-ison"],
  ["-able", "-ible"],
  ["-er", "-or", "-itor"],
  ["-ance", "-ence", "-ancy", "-ency"],
  ["-ant", "-ent"],
  ["-al", "-ial", "-ual"],
  ["-ive", "-ative", "-itive"],
  ["-ic", "-ical", "-atic", "-tic"],
  ["-ory", "-atory", "-ary"],
  ["-ure", "-ture", "-ature"],
];
export const RARE_AFFIXES = new Set([
  "-ison",
  "-ele",
  "-s",
  "-is",
  "-se",
  "-ety",
  "-ise",
  "-ior",
  "-ite",
  "-n",
  "-ice",
  "-th",
  "-dom",
  "-ology",
  "ac-",
  "sur-",
  "a-",
  "mal-",
]);

export function makeBuildQuestions(words: readonly Word[], sessionId: string): BuildQuestion[] {
  const questions: BuildQuestion[] = [];
  const used = new Set<string>();
  for (const word of words)
    for (const form of word.family) {
      const parts = form.parts;
      if (
        !parts ||
        parts.length < 2 ||
        parts.some((part) => !part.trim()) ||
        new Set(parts.map((part) => part.trim().toLowerCase())).size !== parts.length ||
        !form.text.trim() ||
        !form.meaning.trim() ||
        !form.pos.trim()
      )
        continue;
      const sourceId = `build:${word.id}:${form.text.trim().toLowerCase()}`;
      if (used.has(sourceId)) continue;
      const banned = new Set(parts.map((part) => part.trim().toLowerCase()));
      for (const group of AFFIX_GROUPS)
        if (group.some((part) => banned.has(part))) for (const part of group) banned.add(part);
      const pool = (type: "prefix" | "suffix") =>
        shuffleSeeded(
          Object.entries(affixes)
            .filter(([part, entry]) => entry.type === type && !banned.has(part) && !RARE_AFFIXES.has(part))
            .map(([part]) => part),
          `${sessionId}:${sourceId}:${type}`,
        );
      const prefix = pool("prefix").slice(0, 1);
      const suffix = pool("suffix").slice(0, 2);
      if (prefix.length !== 1 || suffix.length !== 2) continue;
      const tiles = shuffleSeeded([...parts, ...prefix, ...suffix], `${sessionId}:${sourceId}:tiles`);
      if (new Set(tiles.map((part) => part.trim().toLowerCase())).size !== tiles.length) continue;
      used.add(sourceId);
      questions.push({
        kind: "build",
        wordId: word.id,
        prompt: `${form.meaning} (${form.pos})`,
        form: form.text,
        answer: [...parts],
        tiles,
        sourceId,
        sourceVersion: catalog.version,
      });
    }
  return questions;
}
