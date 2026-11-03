import { describe, expect, it } from "vitest";
import { isStable, planReviews, replaySkills, skillGaps, skillOf, summariseSkills } from "./skills";
import { INTERVALS, nextDue, statusOf } from "./learning";
import type { AnswerEvent } from "./types";

const DAY = 86_400_000;
const start = Date.parse("2026-10-01T03:00:00Z");
let n = 0;
const answer = (
  at: number,
  kind: AnswerEvent["questionKind"],
  mode: AnswerEvent["mode"],
  correct = true,
  extra: Partial<AnswerEvent> = {},
): AnswerEvent => ({
  id: `s:${n++}`,
  sessionId: "s",
  wordId: "w",
  at,
  day: "",
  correct,
  assisted: false,
  mode,
  questionKind: kind,
  ...extra,
});

describe("two-skill replay", () => {
  it("maps picking to recognition and typing to recall, and never guesses old events", () => {
    expect(skillOf("meaning")).toBe("recognition");
    expect(skillOf("cloze-choice")).toBe("recognition");
    expect(skillOf("listen-choice")).toBe("recognition");
    expect(skillOf("recall")).toBe("recall");
    expect(skillOf("word-form")).toBe("recall");
    expect(skillOf("listen-type")).toBe("recall");
    expect(skillOf(undefined)).toBeNull();
    expect(replaySkills([{ ...answer(start, undefined, "learn") }])).toEqual({});
  });
  it("schedules each skill on its own with the familiar intervals", () => {
    const events = [
      answer(start, "meaning", "learn"),
      answer(start + 1000, "recall", "learn", false),
      answer(start + DAY, "meaning", "review"),
      answer(start + DAY + 1000, "recall", "review", false),
    ];
    const word = replaySkills(events).w;
    expect(word.recognition).toMatchObject({ box: 2, correct: 2, incorrect: 0 });
    expect(word.recognition!.dueAt).toBe(nextDue(start + DAY, INTERVALS[1]));
    expect(word.recall).toMatchObject({ box: 1, correct: 0, incorrect: 2 });
  });
  it("counts one review per day, ignores early reviews and practice, and resets on assisted answers", () => {
    const events = [
      answer(start, "meaning", "learn"),
      answer(start + 1000, "meaning", "review"),
      answer(start + DAY, "meaning", "review"),
      answer(start + DAY + 1000, "meaning", "review"),
      answer(start + DAY + 2000, "meaning", "practice", false),
      answer(start + 4 * DAY, "meaning", "review", false, { assisted: true }),
    ];
    const state = replaySkills(events).w.recognition!;
    expect(state.box).toBe(1);
    expect(state.correct).toBe(4);
    expect(state.incorrect).toBe(1);
  });
  it("summarises tested, stable and due words per skill", () => {
    const events = [answer(start, "meaning", "learn"), answer(start, "recall", "learn", true, { wordId: "v" })];
    const summary = summariseSkills(replaySkills(events), ["w", "v", "x"], start + 2 * DAY);
    expect(summary).toEqual({
      recognition: { tested: 1, stable: 0, due: 1 },
      recall: { tested: 1, stable: 0, due: 1 },
    });
  });
});

describe("two-skill review plan", () => {
  const tested = (startedAt: number, dueAt: number, extra: object = {}) => ({
    startedAt,
    startedDay: "",
    box: 2,
    dueAt,
    correct: 1,
    incorrect: 0,
    tested: true,
    policyVersion: 1 as const,
    ...extra,
  });
  const now = Date.parse("2026-11-20T03:00:00Z");
  const old = Date.parse("2026-10-01T03:00:00Z");
  const fresh = Date.parse("2026-11-10T03:00:00Z");
  it("keeps the legacy single schedule (recall) for words without skill history", () => {
    const plan = planReviews({ a: tested(old, now - 1), b: tested(old, now + DAY) }, {}, ["a", "b"], now);
    expect(plan.due).toEqual([{ wordId: "a", skill: "recall", dueAt: now - 1 }]);
    expect(plan.extra).toEqual([]);
  });
  it("picks the earliest due skill and reviews one skill per word per day", () => {
    const skills = {
      a: {
        recognition: { box: 2, dueAt: now - 2 * DAY, correct: 1, incorrect: 0 },
        recall: { box: 3, dueAt: now - DAY, correct: 1, incorrect: 0 },
      },
      b: {
        recognition: { box: 2, dueAt: now - DAY, correct: 1, incorrect: 0, reviewedDay: "2026-11-20" },
        recall: { box: 1, dueAt: now - DAY, correct: 0, incorrect: 1 },
      },
    };
    const plan = planReviews({ a: tested(old, 0), b: tested(old, 0) }, skills, ["a", "b"], now);
    expect(plan.due).toEqual([{ wordId: "a", skill: "recognition", dueAt: now - 2 * DAY }]);
  });
  it("schedules a new word's missing skill a day after it started, and slips older words' missing skill in as extras", () => {
    const skills = {
      fresh: { recognition: { box: 1, dueAt: now + 5 * DAY, correct: 1, incorrect: 0 } },
      older: { recall: { box: 4, dueAt: now + 5 * DAY, correct: 3, incorrect: 0 } },
    };
    const plan = planReviews({ fresh: tested(fresh, 0), older: tested(old, 0) }, skills, ["fresh", "older"], now);
    expect(plan.due).toEqual([{ wordId: "fresh", skill: "recall", dueAt: nextDue(fresh, INTERVALS[0]) }]);
    expect(plan.extra).toEqual([{ wordId: "older", skill: "recognition", dueAt: old }]);
  });
  it("counts a word as stable only when both skills reach box 5", () => {
    expect(isStable(undefined, 5)).toBe(true);
    expect(isStable({ recall: { box: 6, dueAt: 0, correct: 0, incorrect: 0 } }, 6)).toBe(false);
    expect(
      isStable({
        recall: { box: 5, dueAt: 0, correct: 0, incorrect: 0 },
        recognition: { box: 5, dueAt: 0, correct: 0, incorrect: 0 },
      }),
    ).toBe(true);
  });
});

describe("two-skill review sessions", () => {
  it("asks recognition as a choice and recall as typing, and stays valid for storage", async () => {
    const { beginSkillReview, emptySnapshot } = await import("./learning");
    const { validateSnapshot } = await import("../data/validation");
    const { defaultBook } = await import("../data/catalog");
    const words = defaultBook.catalog.words.slice(0, 4);
    const items = words.map((word, index) => ({
      word,
      skill: index % 2 ? ("recall" as const) : ("recognition" as const),
    }));
    const snapshot = beginSkillReview(
      emptySnapshot(),
      defaultBook.catalog,
      items,
      "Ôn từ đến hạn",
      "review-1",
      Date.now(),
    );
    const kinds = snapshot.session!.questions.map((question) => question.kind);
    expect(kinds.map((kind) => skillOf(kind))).toEqual(["recognition", "recall", "recognition", "recall"]);
    expect(snapshot.session!.mode).toBe("review");
    expect(() => validateSnapshot(snapshot)).not.toThrow();
  });
});

describe("two-skill tie-break", () => {
  it("tests a new word's untested skill first when both fall due together", () => {
    const startedAt = Date.parse("2026-11-10T03:00:00Z");
    const firstDue = nextDue(startedAt, INTERVALS[0]);
    const progress = {
      w: {
        startedAt,
        startedDay: "",
        box: 1,
        dueAt: firstDue,
        correct: 1,
        incorrect: 0,
        tested: true,
        policyVersion: 1 as const,
      },
    };
    const skills = { w: { recognition: { box: 1, dueAt: firstDue, correct: 1, incorrect: 0 } } };
    expect(planReviews(progress, skills, ["w"], firstDue + DAY).due).toEqual([
      { wordId: "w", skill: "recall", dueAt: firstDue },
    ]);
  });
  it("labels a word stable only by the two-skill rule when skill history exists", () => {
    const progress = { box: 5, tested: true } as Parameters<typeof statusOf>[0];
    expect(statusOf(progress)).toBe("Nhớ ổn định");
    const states = {
      recognition: { box: 5, dueAt: 0, correct: 5, incorrect: 0 },
      recall: { box: 2, dueAt: 0, correct: 1, incorrect: 0 },
    };
    expect(statusOf(progress, isStable(states, 5))).toBe("Đang ôn");
    expect(statusOf(progress, isStable({ ...states, recall: { ...states.recall, box: 5 } }, 5))).toBe("Nhớ ổn định");
    expect(statusOf(progress, isStable(undefined, 5))).toBe("Nhớ ổn định");
    expect(statusOf(undefined, true)).toBe("Chưa học");
  });
  it("lists words whose skills are far apart, widest gap first", () => {
    const state = (box: number) => ({ box, dueAt: 0, correct: 0, incorrect: 0 });
    const progress = {
      a: { recognition: state(5), recall: state(1) },
      b: { recognition: state(1), recall: state(3) },
      c: { recognition: state(3), recall: state(2) },
      d: { recognition: state(4) },
    };
    expect(skillGaps(progress, ["a", "b", "c", "d"])).toEqual([
      { wordId: "a", recognition: 5, recall: 1, weaker: "recall" },
      { wordId: "b", recognition: 1, recall: 3, weaker: "recognition" },
    ]);
  });
});
