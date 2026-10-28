import { describe, expect, it } from "vitest";
import { emptySnapshot } from "../domain/learning";
import type { AnswerEvent, Snapshot, WordProgress } from "../domain/types";
import { createChange, importChange, materialize, type CommittedChange } from "./sync";

const time = Date.parse("2026-10-28T04:00:00Z");
const progress: WordProgress = {
  startedAt: time - 86400000,
  startedDay: "2026-10-27",
  box: 2,
  dueAt: time - 1,
  correct: 3,
  incorrect: 1,
  tested: true,
  policyVersion: 1,
};
const event = (id: string, correct = true, mode: AnswerEvent["mode"] = "review"): AnswerEvent => ({
  id: `${id}:0`,
  sessionId: id,
  wordId: "w",
  at: time,
  day: "2026-10-28",
  correct,
  assisted: false,
  mode,
});
const base = (): Snapshot => ({ ...emptySnapshot(), progress: { w: progress } });
const commit = (change: ReturnType<typeof importChange>, order: number): CommittedChange => ({
  change,
  order,
  committedAt: time + order,
});

describe("Account change journal", () => {
  it("keeps legacy progress and old schema-2 snapshots without inventing events", () => {
    const initial = base();
    initial.imports = ["v1-import"];
    initial.legacyArchives = [{ old: true }];
    expect(materialize([commit(importChange(initial, "seed", "a", "initial"), 1)]).progress).toEqual(initial.progress);
    expect(materialize([commit(importChange(initial, "seed", "a", "initial"), 1)]).legacyArchives).toEqual(
      initial.legacyArchives,
    );
    expect(initial.schemaVersion).toBe(2);
  });
  it("does not recount covered historical events or repeated guest imports", () => {
    const guest = { ...base(), events: [event("old")] };
    const result = materialize([
      commit(importChange(guest, "seed", "a", "initial"), 1),
      commit(importChange(guest, "again", "b", "initial"), 2),
    ]);
    expect(result.events).toHaveLength(1);
    expect(result.progress.w).toEqual(progress);
  });
  it("merges two devices by server order, counts each event once and advances at most once per day", () => {
    const seed = commit(importChange(base(), "seed", "a", "initial"), 1);
    const make = (id: string, correct: boolean) =>
      createChange(base(), { ...base(), events: [event(id, correct)] }, id, id, "initial")!;
    const a = commit(make("a", true), 2);
    const b = commit(make("b", false), 3);
    const merged = materialize([b, seed, a, a]);
    expect(merged.events).toHaveLength(2);
    expect(merged.progress.w).toMatchObject({ box: 3, correct: 4, incorrect: 2, reviewedDay: "2026-10-28" });
    expect(materialize([seed, a, b])).toEqual(merged);
  });
  it("uses server time for scheduling even with a wrong client clock", () => {
    const wrong = { ...event("clock"), at: time + 365 * 86400000, day: "2027-10-28" };
    const change = createChange(base(), { ...base(), events: [wrong] }, "clock", "a", "initial")!;
    expect(
      materialize([commit(importChange(base(), "seed", "a", "initial"), 1), commit(change, 2)]).progress.w.reviewedDay,
    ).toBe("2026-10-28");
  });
  it("keeps practice schedules intact and Match leaves progress entirely intact", () => {
    const seed = commit(importChange(base(), "seed", "a", "initial"), 1);
    for (const match of [false, true]) {
      const e = { ...event("practice", true, "practice"), ...(match ? { questionKind: "match" as const } : {}) };
      const change = createChange(base(), { ...base(), events: [e] }, "practice", "a", "initial")!;
      expect(materialize([seed, commit(change, 2)]).progress.w).toMatchObject({
        box: 2,
        dueAt: progress.dueAt,
        ...(match ? { correct: 3 } : { correct: 4 }),
      });
    }
  });
  it("merges independent settings and saved-word edits and keeps sessions local", () => {
    const initial = emptySnapshot();
    const a = createChange(
      initial,
      { ...initial, settings: { ...initial.settings, name: "An" }, savedWords: ["a"] },
      "a",
      "a",
      "initial",
    )!;
    const b = createChange(
      initial,
      { ...initial, settings: { ...initial.settings, dailyNew: 5 }, savedWords: ["b"] },
      "b",
      "b",
      "initial",
    )!;
    const merged = materialize([commit(a, 1), commit(b, 2)]);
    expect(merged.settings).toMatchObject({ name: "An", dailyNew: 5 });
    expect(merged.savedWords).toEqual(["a", "b"]);
    expect(merged.session).toBeNull();
  });
  it("a restore starts a new generation and refuses stale offline changes", () => {
    const before = base();
    const restored = { ...emptySnapshot(), imports: ["backup"], legacyArchives: [{ beforeRestore: before }] };
    const reset = createChange(before, restored, "reset", "a", "initial")!;
    expect(reset.kind).toBe("restore");
    const stale = createChange(before, { ...before, events: [event("stale")] }, "late", "b", "initial")!;
    expect(() => materialize([commit(reset, 1)], [stale])).toThrow(/khôi phục/);
    expect(materialize([commit(reset, 1)]).progress).toEqual({});
  });
});
