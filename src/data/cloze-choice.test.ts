import { describe, expect, it } from "vitest";
import { convertLesson } from "../../scripts/lib/cloze-content.mjs";
import { defaultBook } from "./catalog";
const catalog = defaultBook.catalog;
const clozeLessons = defaultBook.exercises.lessons;
import { validateSnapshot } from "./validation";
import { beginExerciseSession, answerQuestion, emptySnapshot } from "../domain/learning";
import { makeCatalogClozeQuestions, validateClozePack } from "./cloze";
import { readFileSync, readdirSync } from "node:fs";

const word = catalog.words.find((w) => w.text === "agreement")!;
const source = {
  n: 10,
  text: "Both sides reached an ___ .",
  options: { A: "agreement", B: "agree", C: "agreed", D: "agreeable" },
  answer: "A",
};
describe("Authored cloze choices", () => {
  it("accepts option-free catalog sources without allowing them in saved sessions", () => {
    const q = {
      kind: "cloze-choice" as const,
      wordId: word.id,
      sourceId: `catalog:example:${word.id}:0`,
      sourceVersion: "raw-pack",
      prompt: "They reached an ________.",
      answer: word.text,
      options: [],
    };
    const expected = { lessonId: 1, version: "raw-pack", count: 1 };
    const pack = { ...expected, questions: [q] };
    expect(validateClozePack(pack, expected, catalog)).toEqual([q]);
    const rawSession = beginExerciseSession(emptySnapshot(), catalog, [q], "Cloze", "raw", 1);
    expect(() => validateSnapshot(rawSession)).toThrow();
    const prepared = makeCatalogClozeQuestions([q], catalog, "ready");
    expect(prepared).toHaveLength(1);
    const ready = beginExerciseSession(emptySnapshot(), catalog, prepared, "Cloze", "ready", 1);
    expect(validateSnapshot(JSON.parse(JSON.stringify(ready)))).toEqual(ready);
    expect(() =>
      validateClozePack({ ...pack, questions: [{ ...q, sourceId: "v1:part5:1:10" }] }, expected, catalog),
    ).toThrow();
  });
  it("accepts catalog example IDs alongside old Part 5 IDs and preserves both in saved sessions", () => {
    const old = { ...convertLesson(1, [source], catalog.words).questions[0], sourceVersion: "mixed-pack" };
    const example = {
      ...old,
      kind: "cloze-choice" as const,
      sourceId: `catalog:example:${word.id}:0`,
      options: ["agreement", "party", "assurance", "cancellation"],
    };
    const questions = [old, example];
    const pack = { lessonId: 1, version: "mixed-pack", questions };
    const expected = { lessonId: 1, version: "mixed-pack", count: 2 };
    expect(validateClozePack(pack, expected, catalog)).toEqual(questions);
    for (const q of questions) {
      const snapshot = beginExerciseSession(emptySnapshot(), catalog, [q], "Practice", "s", 100);
      expect(validateSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
      expect(answerQuestion(snapshot, "s", 0, q.answer, false, 101).events[0].sourceQuestionId).toBe(q.sourceId);
    }
    for (const sourceId of [`catalog:example:another-word:0`, `catalog:example:${word.id}:-1`, "unknown:0"]) {
      expect(() =>
        validateClozePack({ ...pack, questions: [old, { ...example, sourceId }] }, expected, catalog),
      ).toThrow();
    }
  });
  it("keeps catalog and package versions separate for both authored question labels", () => {
    const raw = { ...source, options: { A: "agreement", B: "party", C: "assurance", D: "cancellation" } };
    for (const item of [source, raw]) {
      const q = { ...convertLesson(1, [item], catalog.words).questions[0], sourceVersion: "authored-package" };
      const state = beginExerciseSession(emptySnapshot(), catalog, [q], "Practice", "s", 100);
      const event = answerQuestion(state, "s", 0, q.answer, false, 101).events[0];
      expect(event).toMatchObject({
        questionKind: q.kind,
        contentVersion: catalog.version,
        sourceVersion: "authored-package",
        sourceQuestionId: q.sourceId,
        scoringVersion: 2,
      });
    }
  });
  it("validates every generated lesson pack and rejects mismatched or cross-lesson data", () => {
    let count = 0;
    let part5 = 0;
    for (const entry of clozeLessons) {
      const pack = JSON.parse(readFileSync(new URL(`../../public${entry.url}`, import.meta.url), "utf8"));
      const questions = validateClozePack(pack, entry, catalog);
      count += questions.length;
      part5 += questions.filter((q) => q.sourceId.startsWith("v1:part5:")).length;
      for (const kind of ["word-form-choice", "cloze-choice"] as const) {
        expect(questions.filter((q) => q.kind === kind)).toHaveLength(entry.kinds[kind]);
      }
      expect(() => validateClozePack({ ...pack, version: "outdated" }, entry, catalog)).toThrow();
      const changed = structuredClone(pack);
      changed.questions[0].wordId = "unknown-word";
      expect(() => validateClozePack(changed, entry, catalog)).toThrow();
    }
    expect(clozeLessons).toHaveLength(50);
    expect(part5).toBe(299);
    expect(count).toBeGreaterThan(part5);
    const files = readdirSync(new URL("../../public/exercises/toeic-600/cloze/", import.meta.url)).sort();
    expect(files).toEqual(clozeLessons.map((entry) => entry.url.split("/").at(-1)).sort());
  });
  it("preserves authored options and links only unique exact answer matches", () => {
    const result = convertLesson(
      1,
      [source, { ...source, n: 11, answer: "Z" }, { ...source, n: 12, options: { ...source.options, A: "unmapped" } }],
      catalog.words,
    );
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toMatchObject({
      kind: "word-form-choice",
      wordId: word.id,
      answer: "agreement",
      sourceId: "v1:part5:1:10",
      options: ["agreement", "agree", "agreed", "agreeable"],
    });
    expect(result.skipped).toHaveLength(2);
    expect(convertLesson(1, [source], [...catalog.words, { ...word, id: "ambiguous" }]).questions).toEqual([]);
  });
  it("grades a practice answer with source metadata without introducing a word or duplicating credit", () => {
    const q = { ...convertLesson(1, [source], catalog.words).questions[0], sourceVersion: "bundle-v1" };
    const state = beginExerciseSession(emptySnapshot(), catalog, [q], "Cloze", "session", 100);
    expect(validateSnapshot(state).session?.mode).toBe("practice");
    const answered = answerQuestion(state, "session", 0, "agreement", false, 101);
    expect(answered.progress).toEqual({});
    expect(answered.events[0]).toMatchObject({
      questionKind: "word-form-choice",
      sourceQuestionId: "v1:part5:1:10",
      contentVersion: catalog.version,
      sourceVersion: "bundle-v1",
      correct: true,
    });
    expect(validateSnapshot(answered)).toBe(answered);
    expect(answerQuestion(answered, "session", 0, "agreement", false, 102).events).toHaveLength(1);
    expect(() => beginExerciseSession(state, catalog, [q], "Other", "other", 102)).toThrow();
    expect(() => beginExerciseSession(emptySnapshot(), catalog, [], "Empty", "empty", 100)).toThrow();
  });
  it("rejects malformed choice payloads and source identifiers", () => {
    const q = { ...convertLesson(1, [source], catalog.words).questions[0], sourceVersion: "bundle-v1" };
    const state = beginExerciseSession(emptySnapshot(), catalog, [q], "Cloze", "session", 100);
    for (const patch of [
      { options: ["wrong"] },
      { options: ["agreement", "agreement"] },
      { sourceVersion: "" },
      { sourceId: "" },
      { prompt: "no blank" },
    ]) {
      const broken = structuredClone(state);
      Object.assign(broken.session!.questions[0], patch);
      expect(() => validateSnapshot(broken)).toThrow();
    }
  });
});
