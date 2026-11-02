import { describe, expect, it } from "vitest";
import { simulateSnapshot } from "./simulate";
import { validateSnapshot } from "../data/validation";
import { dueIds, emptySnapshot, introducedToday } from "./learning";
import { learningStreak } from "./streak";
import { cultivationOf, countLearnedWords } from "./cultivation";
import { defaultBook } from "../data/catalog";

const catalog = defaultBook.catalog;
const at = Date.parse("2026-11-02T05:00:00Z");
const settings = emptySnapshot().settings;

describe("simulateSnapshot", () => {
  it("produces a valid snapshot matching the requested counts", () => {
    const snapshot = validateSnapshot(
      simulateSnapshot(settings, catalog, { learned: 50, due: 7, streak: 4, introducedToday: 3 }, at),
    );
    expect(countLearnedWords(snapshot.progress, () => true)).toBe(50);
    expect(cultivationOf(50).name).toBe("Kim Đan");
    expect(dueIds(snapshot, at)).toHaveLength(7);
    expect(introducedToday(snapshot, at)).toBe(3);
    expect(learningStreak(snapshot.events, at)).toBe(4);
    expect(snapshot.session).toBeNull();
  });
  it("clamps out-of-range input instead of failing", () => {
    const snapshot = validateSnapshot(
      simulateSnapshot(settings, catalog, { learned: 99999, due: -3, streak: Number.NaN, introducedToday: 2 }, at),
    );
    expect(Object.keys(snapshot.progress)).toHaveLength(catalog.words.length);
    expect(dueIds(snapshot, at)).toHaveLength(0);
    expect(snapshot.events).toHaveLength(0);
  });
  it("keeps a streak even with no learned words", () => {
    const snapshot = validateSnapshot(
      simulateSnapshot(settings, catalog, { learned: 0, due: 0, streak: 2, introducedToday: 0 }, at),
    );
    expect(learningStreak(snapshot.events, at)).toBe(2);
  });
});
