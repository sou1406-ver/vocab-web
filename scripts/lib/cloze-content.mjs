const norm = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");

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
    const matches = words.filter(
      (w) =>
        w.lesson === lessonId && [w.text, ...w.family.map((f) => f.text)].some((text) => norm(text) === norm(answer)),
    );
    if (matches.length !== 1) {
      skipped.push({ sourceId, reason: matches.length ? "ambiguous-word" : "unlinked-answer" });
      continue;
    }
    questions.push({
      kind: "cloze-choice",
      sourceId,
      wordId: matches[0].id,
      prompt: q.text.replace(/_{3,}/g, "________"),
      answer,
      options: options.map((v) => v.trim()),
    });
  }
  return { questions, skipped };
}
