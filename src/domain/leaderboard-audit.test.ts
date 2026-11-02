import { describe, expect, it } from "vitest";
import { auditLeaderboard } from "./leaderboard-audit";

const at = Date.parse("2026-11-03T00:00:00Z");
const row = (id: string, username: string, learnedCount: number, updatedAt = at - 1000, avatar = 0) => ({
  id,
  data: { version: 1, username, avatar, learnedCount, updatedAt },
});

describe("leaderboard audit", () => {
  it("flags counts above the book, duplicate names, stale and future updates", () => {
    const audit = auditLeaderboard(
      [
        row("a", "minh", 700),
        row("b", "lan", 40),
        row("c", "lan", 12),
        row("d", "old", 5, at - 40 * 86_400_000),
        row("e", "soon", 5, at + 60 * 60_000),
      ],
      600,
      at,
    );
    const flags = Object.fromEntries(audit.entries.map((item) => [item.id, item.flags]));
    expect(flags).toEqual({
      a: ["over-count"],
      b: ["duplicate-name"],
      c: ["duplicate-name"],
      d: ["stale"],
      e: ["future"],
    });
    expect(audit.flagged).toBe(5);
    expect(audit.highest).toBe(700);
  });
  it("keeps malformed documents visible instead of dropping them", () => {
    const audit = auditLeaderboard(
      [row("ok", "minh", 10), { id: "bad", data: { username: "X Y", learnedCount: -1 } }],
      600,
      at,
    );
    expect(audit.entries.find((item) => item.id === "bad")).toEqual({ id: "bad", entry: null, flags: ["invalid"] });
    expect(audit.average).toBe(10);
    expect(audit.realms[1]).toBe(1);
  });
  it("summarises an empty board without dividing by zero", () => {
    expect(auditLeaderboard([], 600, at)).toMatchObject({ flagged: 0, average: 0, highest: 0 });
  });
});
