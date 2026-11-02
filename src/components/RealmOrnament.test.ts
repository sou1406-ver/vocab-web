import { describe, expect, it } from "vitest";
import { ornamentPlacements } from "./RealmOrnament";
import { cultivationRealms } from "../domain/cultivation";

const clockwise = (angle: number) => ((angle % 360) + 360) % 360;

describe("realm ornaments", () => {
  it("leave the newcomer frame plain and decorate every later realm", () => {
    expect(ornamentPlacements(0)).toHaveLength(0);
    for (let realm = 1; realm < cultivationRealms.length; realm++)
      expect(ornamentPlacements(realm).length).toBeGreaterThan(0);
  });
  it("never cover the realm badge in the lower right", () => {
    for (let realm = 0; realm < cultivationRealms.length; realm++)
      for (const [, angle] of ornamentPlacements(realm))
        expect(clockwise(angle) > 100 && clockwise(angle) < 170, `realm ${realm} at ${angle}°`).toBe(false);
  });
  it("grow richer within each tier", () => {
    for (const tier of [
      [1, 2, 3],
      [4, 5, 6],
    ])
      for (let i = 1; i < tier.length; i++)
        expect(ornamentPlacements(tier[i]).length).toBeGreaterThan(ornamentPlacements(tier[i - 1]).length);
  });
});
