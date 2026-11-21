import { describe, expect, it } from "vitest";
import { plantHealth, plantStage } from "./garden-state";

const now = Date.parse("2026-11-21T10:00:00+07:00");
const at = (daysAgo: number) => now - daysAgo * 86_400_000;

describe("journey plants", () => {
  it("distinguishes due today, overdue, and wilting by Vietnam calendar day", () => {
    expect(plantHealth(now, undefined, now)).toBe("due");
    expect(plantHealth(at(2), undefined, now)).toBe("dry");
    expect(plantHealth(at(3), undefined, now)).toBe("wilted");
  });

  it("keeps a plant slightly thirsty after a missed review without making another review due", () => {
    expect(plantHealth(undefined, { at: now, correct: false }, now)).toBe("recovering");
    expect(plantHealth(undefined, { at: now, correct: true }, now)).toBe("healthy");
    expect(plantHealth(undefined, { at: at(1), correct: false }, now)).toBe("healthy");
  });

  it("uses two skills and counts the least advanced required sense", () => {
    expect(plantStage([{ recognition: 3, recall: 2 }])).toBe("non");
    expect(plantStage([{ recognition: 3, recall: 3 }])).toBe("truong-thanh");
    expect(plantStage([{ recognition: 5, recall: 5 }])).toBe("no-hoa");
    expect(
      plantStage([
        { recognition: 5, recall: 5 },
        { recognition: 2, recall: 1 },
      ]),
    ).toBe("mam");
  });
});
