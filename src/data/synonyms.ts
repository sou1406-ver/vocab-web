import { distractorPool, type TestedProgress } from "../domain/distractors";
import { catalogFor } from "./catalog";
import { normalizeAnswer } from "../domain/learning";
import { shuffleSeeded } from "../domain/random";
import { singleWordMatch } from "../domain/word-match";
import type { SynonymQuestion, Word } from "../domain/types";

const terms = (values: readonly string[]) => {
  const seen = new Set<string>();
  return values
    .flatMap((value) => value.split(/[;,]/))
    .map((value) => value.trim().replace(/\s+/g, " "))
    .filter((value) => {
      const key = normalizeAnswer(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};
const profile = (word: Word) => ({
  word,
  text: normalizeAnswer(word.text),
  pos: normalizeAnswer(word.pos).replace(/\./g, ""),
  synonyms: new Set(terms(word.synonyms).map(normalizeAnswer)),
  family: new Set(word.family.map((entry) => normalizeAnswer(entry.text))),
  terms: terms([word.text, ...word.synonyms]),
});

export function makeSynonymQuestions(
  words: readonly Word[],
  all: readonly Word[],
  kind: SynonymQuestion["kind"],
  sessionId: string,
  progress: TestedProgress = {},
): SynonymQuestion[] {
  const entries = all.map(profile);
  const questions: SynonymQuestion[] = [];
  for (const word of words) {
    const target = profile(word);
    const antonyms = terms(word.antonyms);
    const opposite = new Set(antonyms.map(normalizeAnswer));
    const syn = terms(word.synonyms).filter(
      (term) => normalizeAnswer(term) !== target.text && !opposite.has(normalizeAnswer(term)),
    );
    const ant = antonyms.filter(
      (term) => normalizeAnswer(term) !== target.text && !target.synonyms.has(normalizeAnswer(term)),
    );
    const direction =
      kind === "synonym-context"
        ? "synonym"
        : !syn.length && ant.length
          ? "antonym"
          : ant.length
            ? shuffleSeeded(["antonym", "synonym", "synonym"] as const, `${sessionId}:${word.id}:direction`)[0]
            : "synonym";
    const answers = direction === "antonym" ? ant : syn;
    if (!answers.length) continue;
    const exampleIndex =
      kind === "synonym-context"
        ? word.examples.findIndex((example) => !/_{3,}/.test(example.text) && singleWordMatch(example.text, word.text))
        : -1;
    if (kind === "synonym-context" && exampleIndex < 0) continue;
    const forbidden = new Set([target.text, ...target.synonyms, ...opposite, ...target.family]);
    const unsafe = new Set<string>();
    for (const entry of entries)
      if (
        entry.word.id === word.id ||
        forbidden.has(entry.text) ||
        entry.synonyms.has(target.text) ||
        entry.family.has(target.text) ||
        [...entry.synonyms].some((term) => target.synonyms.has(term))
      ) {
        for (const term of entry.terms) unsafe.add(normalizeAnswer(term));
      }
    const names = new Set<string>();
    const pool: string[] = [];
    for (const candidate of distractorPool(word, all, progress, sessionId)) {
      const entry = profile(candidate);
      const key = entry.text;
      if (
        candidate.id === word.id ||
        forbidden.has(key) ||
        unsafe.has(key) ||
        names.has(key) ||
        entry.synonyms.has(target.text) ||
        entry.family.has(target.text) ||
        [...entry.synonyms].some((term) => target.synonyms.has(term))
      )
        continue;
      names.add(key);
      pool.push(candidate.text.trim());
    }
    if (pool.length < 3) continue;
    const sourceId = `${kind}:${word.id}:${kind === "synonym-context" ? exampleIndex : direction}`;
    const answer = shuffleSeeded(answers, `${sessionId}:${sourceId}:answer`)[0];
    const wrong = pool.slice(0, 3);
    questions.push({
      kind,
      wordId: word.id,
      prompt: kind === "synonym-context" ? word.examples[exampleIndex].text : word.text,
      answer,
      options: shuffleSeeded([answer, ...wrong], `${sessionId}:${sourceId}:options`),
      direction,
      ...(kind === "synonym-context" ? { target: word.text } : {}),
      sourceId,
      sourceVersion: catalogFor(word.id).version,
    });
  }
  return questions;
}
