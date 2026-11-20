import { describe, expect, it } from "vitest";
import { acknowledgeCultivation, captureStudyBaseline, studySummary } from "./study-progress";
import { answerQuestion, beginSession, emptySnapshot } from "./learning";
import { validateSnapshot } from "../data/validation";
import { createChange, importChange, materialize } from "../data/sync";
import type { Snapshot, Word, WordProgress } from "./types";
const at = Date.parse("2026-11-19T04:00:00Z");
const progress = (tested = true): WordProgress => ({
  startedAt: at - 86400000,
  startedDay: "2026-11-18",
  box: 1,
  dueAt: at + 86400000,
  correct: 1,
  incorrect: 0,
  tested,
  policyVersion: 1,
});
const words: Word[] = Array.from({ length: 12 }, (_, i) => ({
  id: `w${i}`,
  lesson: 1,
  text: `word${i}`,
  pos: "n",
  ipa: "",
  meaning: `nghĩa ${i}`,
  definition: "definition",
  examples: [],
  family: [],
  synonyms: [],
  antonyms: [],
  parts: [],
}));
const catalog = { version: "test", words, lessons: [], topics: [] };
const nine = (): Snapshot => ({
  ...emptySnapshot(),
  progress: Object.fromEntries(words.slice(0, 9).map((w) => [w.id, progress()])),
});
describe("study progress presentation", () => {
  it("does not count already stable custom and other-book participants as newly stable", () => {
    const custom = { ...words[0], id: "custom:stable" };
    const otherBook = { ...words[1], id: "other-book:stable" };
    const participants = [custom, otherBook];
    const baseline = emptySnapshot();
    baseline.customWords = [custom];
    baseline.progress = Object.fromEntries(
      participants.map((word) => [word.id, { ...progress(), box: 5, dueAt: at - 1 }]),
    );
    baseline.events = participants.flatMap((word) =>
      (["meaning", "recall"] as const).flatMap((kind, skillIndex) =>
        Array.from({ length: 5 }, (_, index) => ({
          id: `${word.id}-${kind}-${index}:0`,
          sessionId: `${word.id}-${kind}-${index}`,
          wordId: word.id,
          at: at - (1000 - skillIndex * 500 - index * 100) * 86400000,
          day: "2026-11-18",
          correct: true,
          assisted: false,
          mode: (index === 0 ? "learn" : "review") as "learn" | "review",
          questionKind: kind,
        })),
      ),
    );
    let session = beginSession(baseline, catalog, participants, "review", "mixed books", "mixed", at);
    const question = session.session!.questions[0];
    session = answerQuestion(session, "mixed", 0, question.answer, false, at);
    expect(studySummary(session, [...catalog.words, custom, otherBook], () => true, at)).toMatchObject({
      newLearned: 0,
      newStable: 0,
    });
    expect(session.session!.progressBaseline!.stableIds).toEqual(
      expect.arrayContaining(participants.map((word) => word.id)),
    );
  });
  it("records a real nine-to-ten crossing atomically without changing answer scores or schedules", () => {
    const before = beginSession(nine(), catalog, [words[9]], "learn", "learn", "s", at);
    const question = { ...before, session: { ...before.session!, phase: "question" as const } };
    const answered = answerQuestion(question, "s", 0, question.session.questions[0].answer, false, at);
    const after = acknowledgeCultivation(question, answered, () => true);
    expect(after.cultivationSeen).toEqual([10]);
    expect(after.progress).toEqual(answered.progress);
    expect(after.events).toEqual(answered.events);
    expect(validateSnapshot(JSON.parse(JSON.stringify(after))).cultivationSeen).toEqual([10]);
    expect(studySummary(after, words, () => true, at)).toMatchObject({
      correct: 1,
      total: 1,
      newLearned: 1,
      newStable: 0,
      remaining: 15,
    });
    expect(acknowledgeCultivation(after, after, () => true)).toEqual(after);
  });
  it("does not replay old milestones or earn a milestone through practice", () => {
    const before = { ...nine(), progress: { ...nine().progress, w9: progress() } };
    expect(acknowledgeCultivation(before, before, () => true).cultivationSeen).toBeUndefined();
    const practice = beginSession(nine(), catalog, [words[9]], "practice", "practice", "p", at);
    const after = answerQuestion(practice, "p", 0, practice.session!.questions[0].answer, false, at);
    const shown = acknowledgeCultivation(practice, after, () => true);
    expect(shown.cultivationSeen).toBeUndefined();
    expect(shown.progress).toEqual(practice.progress);
  });
  it("deduplicates grouped meanings and uses both actual skills for newly stable words", () => {
    const base = nine();
    base.progress.extra = { ...progress(), groupWordId: "w0" };
    expect(captureStudyBaseline(base, words).learnedIds).toHaveLength(9);
    const events = (["meaning", "recall"] as const).flatMap((kind, k) =>
      Array.from({ length: 5 }, (_, i) => ({
        id: `${kind}${i}:0`,
        sessionId: `${kind}${i}`,
        wordId: "w0",
        at: at + (k * 5 + i) * 10000000000,
        day: "2026-11-19",
        correct: true,
        assisted: false,
        mode: (i ? "review" : "learn") as "learn" | "review",
        questionKind: kind,
      })),
    );
    const before = { ...base, events: events.slice(0, -1) };
    const session = beginSession(before, catalog, [words[0]], "review", "review", "s", at);
    const after = { ...session, events: [...events.slice(0, -1), { ...events.at(-1)!, id: "s:0", sessionId: "s" }] };
    expect(studySummary(after, words, () => true, at)).toMatchObject({ newLearned: 0, newStable: 1 });
  });
  it("merges milestone acknowledgements from two devices and accepts old snapshots", () => {
    const base = emptySnapshot();
    const a = { ...base, cultivationSeen: [10] };
    const b = { ...base, cultivationSeen: [25] };
    const seed = { change: importChange(base, "seed", "a", "initial"), order: 1, committedAt: at };
    const ca = { change: createChange(base, a, "a", "a", "initial")!, order: 2, committedAt: at + 1 };
    const cb = { change: createChange(base, b, "b", "b", "initial")!, order: 3, committedAt: at + 2 };
    expect(materialize([cb, seed, ca, ca]).cultivationSeen).toEqual([10, 25]);
    expect(materialize([{ ...seed, change: importChange(a, "seed", "a", "initial") }]).cultivationSeen).toEqual([10]);
    expect(validateSnapshot(base)).toEqual(base);
    for (const cultivationSeen of [[10, 10], [11], ["10"], "10"])
      expect(() => validateSnapshot({ ...base, cultivationSeen })).toThrow();
  });
});
