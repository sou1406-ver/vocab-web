import { describe, expect, it } from "vitest";
import { cultivationOf, cultivationRealms, countLearnedWords, rankCultivators, readCultivator } from "./cultivation";
import { emptySnapshot } from "./learning";

describe("Cultivation based on learned vocabulary", () => {
  it("has twelve stages and advances exactly at each word milestone", () => {
    expect(cultivationRealms).toHaveLength(12);
    expect(cultivationOf(0)).toMatchObject({ index: 0, name: "Phàm Nhân", next: 10, progress: 0 });
    for (const [index, realm] of cultivationRealms.entries()) {
      expect(cultivationOf(realm.words)).toMatchObject({ index, name: realm.name });
      if (index) expect(cultivationOf(realm.words - 1).index).toBe(index - 1);
    }
    expect(cultivationOf(10000)).toMatchObject({ index: 11, name: "Tiên Đế", next: null, progress: 100 });
    expect(cultivationOf(15).progress).toBeCloseTo(100 / 3);
  });
  it("counts each tested catalog word once, excluding untested, custom and removed IDs", () => {
    const p = {
      startedAt: 1,
      startedDay: "2026-10-31",
      box: 1,
      dueAt: 2,
      correct: 20,
      incorrect: 0,
      tested: true,
      policyVersion: 1 as const,
    };
    const progress = { one: p, two: { ...p, tested: false }, custom: p, removed: p };
    expect(countLearnedWords(progress, (id) => ["one", "two"].includes(id))).toBe(1);
    expect(emptySnapshot().schemaVersion).toBe(2);
  });
  it("validates public fields and ranks ties equally without exposing other profile data", () => {
    const profile = { version: 1, username: "dao_huu", avatar: 0, learnedCount: 50, updatedAt: 1 };
    const a = readCultivator("a", profile);
    const b = readCultivator("b", profile);
    const c = readCultivator("c", { ...profile, learnedCount: 10 });
    const before = structuredClone([c, b, a]);
    expect(rankCultivators(before).map((entry) => [entry.id, entry.rank])).toEqual([
      ["a", 1],
      ["b", 1],
      ["c", 3],
    ]);
    expect(before.map((entry) => entry.id)).toEqual(["c", "b", "a"]);
    for (const patch of [
      { avatar: 20 },
      { avatar: -1 },
      { email: "private@example.test" },
      { learnedCount: -1 },
      { learnedCount: 1.5 },
      { learnedCount: Infinity },
      { username: "" },
      { username: "email@example.test" },
      { version: 2 },
    ])
      expect(() => readCultivator("a", { ...profile, ...patch })).toThrow();
  });
});
