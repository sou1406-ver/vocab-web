import { describe, expect, it } from "vitest";
import { beginSession, emptySnapshot } from "./learning";
import { catalog } from "../data/catalog";
import { setWordSaved } from "./personal";
import { validateSnapshot } from "../data/validation";

describe("Saved words", () => {
  it("saves once without introducing a word or changing events/schedule", () => {
    const initial = emptySnapshot();
    const saved = setWordSaved(setWordSaved(initial, "agreement-1", true), "agreement-1", true);
    expect(saved.savedWords).toEqual(["agreement-1"]);
    expect(saved.progress).toEqual({});
    expect(saved.events).toEqual([]);
    expect(initial.savedWords ?? []).toEqual([]);
  });
  it("removes saved membership without losing learning progress", () => {
    const initial = emptySnapshot();
    initial.progress["agreement-1"] = {
      startedAt: 1,
      startedDay: "2026-10-24",
      box: 2,
      dueAt: 100,
      correct: 2,
      incorrect: 1,
      tested: true,
      policyVersion: 1,
    };
    const saved = setWordSaved(initial, "agreement-1", true);
    expect(setWordSaved(saved, "agreement-1", false)).toMatchObject({ savedWords: [], progress: initial.progress });
  });
  it("accepts old snapshots and preserves saved words through JSON backup validation", () => {
    const old = emptySnapshot();
    delete old.savedWords;
    expect(validateSnapshot(old)).toEqual(old);
    const saved = setWordSaved(old, "agreement-1", true);
    expect(validateSnapshot(JSON.parse(JSON.stringify(saved))).savedWords).toEqual(["agreement-1"]);
  });
  it("rejects malformed/duplicate saved IDs", () => {
    for (const savedWords of [[7], ["agreement-1", "agreement-1"], ["__proto__"], [""]]) {
      expect(() => validateSnapshot({ ...emptySnapshot(), savedWords })).toThrow();
    }
  });
  it("keeps a reading return link through backups and refuses external/unsafe URLs", () => {
    const snapshot = beginSession(emptySnapshot(), catalog, [catalog.words[0]], "learn", "Saved", "test", 1);
    snapshot.session!.returnTo = "/knowledge/reading-at-work";
    expect(validateSnapshot(JSON.parse(JSON.stringify(snapshot))).session?.returnTo).toBe("/knowledge/reading-at-work");
    for (const returnTo of [
      "https://example.com",
      "//example.com",
      "javascript:alert(1)",
      "/knowledge/../../settings",
    ]) {
      expect(() => validateSnapshot({ ...snapshot, session: { ...snapshot.session, returnTo } })).toThrow();
    }
  });
});
