const norm = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");
import { familyForms, classificationForms } from "./word-forms.mjs";
import { shuffleSeeded } from "../../src/domain/random.mjs";

const optionSetKey = (options) => JSON.stringify(options.map(norm).sort());

/** @param {string} answer @param {string[]} pool @param {Set<string>} used */
function chooseDistinctOptions(answer, pool, used) {
  const initial = [answer, ...pool.slice(0, 3)];
  if (!used.has(optionSetKey(initial))) return initial;
  for (let first = 0; first < pool.length - 2; first++) {
    for (let second = first + 1; second < pool.length - 1; second++) {
      for (let third = second + 1; third < pool.length; third++) {
        const options = [answer, pool[first], pool[second], pool[third]];
        if (!used.has(optionSetKey(options))) return options;
      }
    }
  }
  return initial;
}

/**
 * @param {number} lessonId
 * @param {import("../../src/domain/types").Word[]} words
 * @param {Pick<import("../../src/domain/types").Lesson, "id" | "topicId">[]} lessons
 */
export function createCatalogCloze(lessonId, words, lessons = []) {
  const topicId = lessons.find((lesson) => lesson.id === lessonId)?.topicId;
  const topicLessons = new Set(
    lessons.filter((lesson) => topicId !== undefined && lesson.topicId === topicId).map((lesson) => lesson.id),
  );
  const entries = words
    .filter((word) => word.lesson === lessonId || topicLessons.has(word.lesson))
    .map((word) => ({
      word,
      forms: classificationForms(word),
      synonyms: new Set(word.synonyms.map(norm)),
      pos: norm(word.pos).replace(/\./g, ""),
    }));
  /** @type {Omit<import("../../src/domain/types").ClozeChoiceQuestion, "sourceVersion">[]} */
  const questions = [];
  const usedOptions = new Set();
  for (const target of entries) {
    const { word, forms, synonyms, pos } = target;
    if (word.lesson !== lessonId) continue;
    const pool = [];
    const names = new Set([norm(word.text)]);
    for (const candidate of entries) {
      const text = norm(candidate.word.text);
      if (
        candidate.word.id === word.id ||
        candidate.pos !== pos ||
        names.has(text) ||
        [...candidate.forms].some((form) => forms.has(form) || synonyms.has(form)) ||
        [...forms].some((form) => candidate.synonyms.has(form))
      )
        continue;
      pool.push(candidate.word.text.trim());
      names.add(text);
    }
    if (pool.length < 3) continue;
    const options = chooseDistinctOptions(word.text.trim(), shuffleSeeded(pool, word.id), usedOptions);
    const escaped = word.text.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
    for (const [index, example] of word.examples.entries()) {
      if (/_{3,}/.test(example.text) || example.text.match(pattern)?.length !== 1) continue;
      questions.push({
        kind: "cloze-choice",
        sourceId: `catalog:example:${word.id}:${index}`,
        wordId: word.id,
        prompt: example.text.replace(pattern, "________"),
        answer: word.text.trim(),
        options,
      });
      usedOptions.add(optionSetKey(options));
      break;
    }
  }
  return questions;
}

/**
 * @param {number} lessonId
 * @param {unknown} input
 * @param {import("../../src/domain/types").Word[]} words
 */
export function convertLesson(lessonId, input, words) {
  if (!Array.isArray(input)) throw new Error(`Missing Part 5 source for lesson ${lessonId}`);
  /** @type {Omit<import("../../src/domain/types").ClozeChoiceQuestion, "sourceVersion">[]} */
  const questions = [];
  const skipped = [];
  const linked = [];
  const lessonWords = words
    .filter((word) => word.lesson === lessonId)
    .map((word) => ({ word, forms: familyForms(word) }));
  const sourceIds = new Set();
  for (const raw of input) {
    const q = raw && typeof raw === "object" ? raw : {};
    const sourceId = `v1:part5:${lessonId}:${q.n}`;
    const options = ["A", "B", "C", "D"].map((key) => q.options?.[key]);
    if (
      !Number.isInteger(q.n) ||
      q.n < 1 ||
      typeof q.text !== "string" ||
      (q.text.match(/_{3,}/g) ?? []).length !== 1 ||
      options.some((v) => typeof v !== "string" || !v.trim()) ||
      !["A", "B", "C", "D"].includes(q.answer) ||
      new Set(options.map(norm)).size !== 4
    ) {
      skipped.push({ sourceId, reason: "invalid-source" });
      continue;
    }
    if (sourceIds.has(sourceId)) throw new Error(`Duplicate source question: ${sourceId}`);
    sourceIds.add(sourceId);
    const answer = q.options[q.answer].trim();
    const matches = lessonWords.filter(({ forms }) => forms.has(norm(answer)));
    if (matches.length !== 1) {
      skipped.push({ sourceId, reason: matches.length ? "ambiguous-word" : "unlinked-answer" });
      continue;
    }
    const { word } = matches[0];
    const family = classificationForms(word);
    const kind = options.filter((option) => family.has(norm(option))).length >= 3 ? "word-form-choice" : "cloze-choice";
    const exact = [word.text, ...word.family.map((f) => f.text)].some((text) => norm(text) === norm(answer));
    linked.push({ sourceId, wordId: word.id, kind, method: exact ? "exact" : "inflection" });
    questions.push({
      kind,
      sourceId,
      wordId: word.id,
      prompt: q.text.replace(/_{3,}/g, "________"),
      answer,
      options: options.map((v) => v.trim()),
    });
  }
  return { questions, skipped, linked };
}
