import type { Snapshot, Word } from "./types";
import { shuffleSeeded } from "./random";

export type TestedProgress = Readonly<Snapshot["progress"]>;
const pos = (value: string) => value.trim().toLowerCase().replace(/\./g, "");

// This is an eligibility boundary, not just a ranking preference. Unknown words
// from another lesson never enter a tier, even when a local tier is too small.
export function distractorPool(word: Word, all: readonly Word[], progress: TestedProgress, seed: string): Word[] {
  const local = all.filter((candidate) => candidate.lesson === word.lesson);
  const samePos = all.filter(
    (candidate) =>
      pos(candidate.pos) === pos(word.pos) &&
      (candidate.lesson === word.lesson || progress[candidate.id]?.tested === true),
  );
  const otherPos = local.filter((candidate) => pos(candidate.pos) !== pos(word.pos));
  const family = local.flatMap((parent) =>
    parent.family.map(
      (form, index): Word => ({
        ...parent,
        id: `family:${parent.id}:${index}`,
        text: form.text,
        pos: form.pos,
        meaning: form.meaning,
        family: [...parent.family, { text: parent.text, pos: parent.pos, meaning: parent.meaning }],
      }),
    ),
  );
  return [
    samePos,
    otherPos,
    family.filter((form) => pos(form.pos) === pos(word.pos)),
    family.filter((form) => pos(form.pos) !== pos(word.pos)),
  ].flatMap((tier, index) => shuffleSeeded(tier, `${seed}:${word.id}:pool:${index}`));
}
