import { describe, expect, it } from "vitest";
import { avatarSeeds, avatarSource } from "./avatar";

describe("Static avatar selection", () => {
  it("offers twenty distinct local images", () => {
    expect(avatarSeeds).toHaveLength(20);
    expect(new Set(avatarSeeds.map(avatarSource)).size).toBe(20);
    for (const seed of avatarSeeds) expect(avatarSource(seed)).toMatch(/^\/avatars\/notionists\/\d{2}\.svg$/);
  });
  it("maps old name and random seeds consistently without changing them", () => {
    for (const seed of ["Vocab guest", "Sou", "vocab-avatar-5", "old-random-seed"]) {
      expect(avatarSeeds.map(avatarSource)).toContain(avatarSource(seed));
      expect(avatarSource(seed)).toBe(avatarSource(seed));
    }
  });
});
