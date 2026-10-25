import { describe, expect, it } from "vitest";
import { convertLesson } from "../../scripts/lib/cloze-content.mjs";
import { catalog } from "./catalog";
import { validateSnapshot } from "./validation";
import { beginExerciseSession, answerQuestion, emptySnapshot } from "../domain/learning";
import { clozeLessons, validateClozePack } from "./cloze";
import { readFileSync } from "node:fs";

const word = catalog.words.find((w) => w.text === "agreement")!;
const source = {
  n: 10,
  text: "Both sides reached an ___ .",
  options: { A: "agreement", B: "agree", C: "agreed", D: "agreeable" },
  answer: "A",
};
describe("Authored cloze choices", () => {
  it("validates every generated lesson pack and rejects mismatched or cross-lesson data", () => {
    let count = 0;
    for (const entry of clozeLessons) {
      const pack = JSON.parse(readFileSync(new URL(`../../public${entry.url}`, import.meta.url), "utf8"));
      const questions = validateClozePack(pack, entry);
      count += questions.length;
      expect(() => validateClozePack({ ...pack, version: "outdated" }, entry)).toThrow();
      const changed = structuredClone(pack);
      changed.questions[0].wordId = "unknown-word";
      expect(() => validateClozePack(changed, entry)).toThrow();
    }
    expect(clozeLessons).toHaveLength(50);
    expect(count).toBe(223);
  });
  it("preserves authored options and links only unique exact answer matches", () => {
    const result = convertLesson(
      1,
      [source, { ...source, n: 11, answer: "Z" }, { ...source, n: 12, options: { ...source.options, A: "unmapped" } }],
      catalog.words,
    );
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toMatchObject({
      kind: "cloze-choice",
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
      questionKind: "cloze-choice",
      sourceQuestionId: "v1:part5:1:10",
      contentVersion: "bundle-v1",
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
