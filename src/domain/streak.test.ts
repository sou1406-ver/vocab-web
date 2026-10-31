import { describe, expect, it } from "vitest";
import { learningStreak } from "./streak";

const event = (at: string) => ({ at: Date.parse(at) });
describe("Vietnam learning streak", () => {
  it("is zero without study events", () => {
    expect(learningStreak([], Date.parse("2026-10-31T12:00:00Z"))).toBe(0);
  });
  it("counts each Vietnam day once, including wrong or practice answers", () => {
    expect(
      learningStreak(
        [event("2026-10-29T18:00:00Z"), event("2026-10-30T18:00:00Z"), event("2026-10-31T03:00:00Z")],
        Date.parse("2026-10-31T12:00:00Z"),
      ),
    ).toBe(2);
  });
  it("keeps yesterday's streak through the end of today", () => {
    const events = [event("2026-10-29T08:00:00Z"), event("2026-10-30T08:00:00Z")];
    expect(learningStreak(events, Date.parse("2026-10-31T16:59:59Z"))).toBe(2);
    expect(learningStreak(events, Date.parse("2026-10-31T17:00:00Z"))).toBe(0);
  });
  it("extends the streak when a first answer is recorded today", () => {
    expect(
      learningStreak(
        [event("2026-10-29T08:00:00Z"), event("2026-10-30T08:00:00Z"), event("2026-10-31T08:00:00Z")],
        Date.parse("2026-10-31T12:00:00Z"),
      ),
    ).toBe(3);
  });
  it("stops at a missing day even if older days were studied", () => {
    expect(
      learningStreak(
        [event("2026-10-28T08:00:00Z"), event("2026-10-30T08:00:00Z")],
        Date.parse("2026-10-31T12:00:00Z"),
      ),
    ).toBe(1);
  });
  it("ignores invalid timestamps and future events", () => {
    expect(learningStreak([{ at: NaN }, event("2026-11-01T08:00:00Z")], Date.parse("2026-10-31T12:00:00Z"))).toBe(0);
  });
  it("counts a newly answered event ahead of the store clock on the same Vietnam day", () => {
    const clock = Date.parse("2026-10-31T16:59:30Z");
    expect(
      learningStreak(
        [event("2026-10-30T08:00:00Z"), event("2026-10-31T16:59:45Z"), event("2026-10-31T17:00:00Z")],
        clock,
      ),
    ).toBe(2);
  });
});
